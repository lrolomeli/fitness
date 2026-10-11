const { Router } = require('express');
const recipes = require('../db/repos/recipes');
const preferences = require('../db/repos/preferences');
const { estimateMacros, ingredientName } = require('../services/estimator');
const planner = require('../services/planner');
const ai = require('../services/ai');
const { allocateBatch } = require('../services/proposalBatch');
const { buildContext } = require('../services/context');

const router = Router();

function parseIngredients(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeMacros(body, ingredients) {
  const macros = {
    kcal: Number(body.kcal) || 0,
    protein_g: Number(body.protein_g) || 0,
    carbs_g: Number(body.carbs_g) || 0,
    fat_g: Number(body.fat_g) || 0,
  };
  if (!macros.kcal && ingredients.length) return estimateMacros(ingredients);
  return macros;
}

router.get('/', (req, res) => {
  res.json({
    active: recipes.listActive(req.query.slot),
    proposed: recipes.listProposed(),
    disabled: recipes.listDisabled(),
    coverage: planner.coverageBySlot(),
    targets: planner.SLOT_TARGETS,
    poolTarget: planner.POOL_TARGET,
  });
});

// Alta manual: por defecto entra como propuesta (el cliente puede pedir "active").
router.post('/', (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

  const ingredients = parseIngredients(body.ingredients);
  const macros = normalizeMacros(body, ingredients);

  const created = recipes.upsertRecipe({
    title,
    slot: body.slot || 'lunch',
    ingredients,
    servings: body.servings || 1,
    source: body.status === 'active' ? 'manual' : 'form',
    status: body.status || 'proposed',
    ...macros,
  });
  res.status(201).json(created);
});

// Reponer/ampliar el recetario con IA: genera al menos 10 propuestas y, si el
// déficit es mayor, exactamente las necesarias. Reparto proporcional al déficit.
// La meta (30) es un mínimo para variedad, no un máximo: si ya se alcanzó, se
// generan 10 propuestas repartidas entre los momentos del día.
router.post('/proposals', async (req, res) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'La IA no está configurada (falta GEMINI_API_KEY)' });
    }
    const deficit = planner.poolDeficit();
    const total = Object.values(deficit).reduce((a, b) => a + b, 0);
    const weights = total ? deficit : planner.SLOT_TARGETS;

    const target = Math.max(10, total);
    const batch = allocateBatch(weights, planner.SLOT_ORDER, target);
    const wanted = Object.values(batch).reduce((a, b) => a + b, 0);
    if (!wanted) return res.json({ created: [] });

    const ctx = buildContext();
    const existingTitles = recipes.list().map((r) => r.title);
    const generated = await ai.generateRecipeProposals(ctx.meal, {
      deficit: batch,
      existingTitles,
    });

    const created = [];
    const seen = new Set(existingTitles.map((t) => recipes.titleKey(t)));
    for (const recipe of generated) {
      if (!planner.SLOT_ORDER.includes(recipe.slot)) continue;
      const ingredients = parseIngredients(recipe.ingredients);
      if (!recipe.title || !ingredients.length) continue;
      const key = recipes.titleKey(recipe.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const saved = recipes.upsertRecipe({
        title: recipe.title,
        slot: recipe.slot,
        ingredients,
        source: 'ai',
        status: 'proposed',
        kcal: recipe.kcal,
        protein_g: recipe.protein_g,
        carbs_g: recipe.carbs_g,
        fat_g: recipe.fat_g,
      });
      if (saved) created.push(saved);
    }

    res.status(201).json({ created });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Limpia recetas repetidas del recetario (mismo título normalizado, sin importar
// el slot). Conserva una por grupo y elimina el resto.
router.post('/dedupe', (req, res) => {
  const removed = recipes.dedupe();
  res.json({ removed });
});

// Vetar un platillo o sus ingredientes desde una propuesta: se guarda en
// preferences (para no volver a proponerlo) y la propuesta se elimina.
router.post('/:id/ban', (req, res) => {
  const recipe = recipes.get(Number(req.params.id));
  if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });

  const { items, whole } = req.body || {};
  const raw = whole ? [recipe.title] : Array.isArray(items) ? items : [];
  // Guarda solo el ingrediente (sin cantidades) y evita repetidos en la petición.
  const values = raw
    .map((value) => (whole ? String(value).trim() : ingredientName(value)))
    .filter(Boolean);

  if (!values.length) {
    return res.status(400).json({ error: 'Nada que vetar' });
  }

  const added = [
    ...new Map(
      values
        .map((value) => {
          try {
            return preferences.add({
              type: 'banned',
              value,
              notes: `Vetado desde "${recipe.title}"`,
            });
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map((pref) => [pref.id, pref])
    ).values(),
  ];

  recipes.remove(recipe.id);
  res.status(201).json({ added });
});

router.patch('/:id/status', (req, res) => {
  const status = req.body?.status;
  if (!recipes.STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status debe ser active, proposed o disabled' });
  }
  const updated = recipes.setStatus(Number(req.params.id), status);
  if (!updated) return res.status(404).json({ error: 'Receta no encontrada' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  recipes.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
