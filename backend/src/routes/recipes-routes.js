const { Router } = require('express');
const recipes = require('../db/repos/recipes');
const { estimateMacros } = require('../services/estimator');
const planner = require('../services/planner');
const ai = require('../services/ai');
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

// Reponer el recetario con IA: genera hasta 10 propuestas según el déficit.
router.post('/proposals', async (req, res) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'La IA no está configurada (falta GEMINI_API_KEY)' });
    }
    const deficit = planner.poolDeficit();
    const total = Object.values(deficit).reduce((a, b) => a + b, 0);
    if (!total) {
      return res.json({ created: [], message: 'El recetario ya tiene sus 30 recetas activas' });
    }

    // Reparte hasta 10 propuestas por corrida, priorizando los slots con déficit.
    const batch = {};
    let budget = 10;
    for (const slot of planner.SLOT_ORDER) {
      const take = Math.min(deficit[slot], budget);
      if (take > 0) batch[slot] = take;
      budget -= take;
      if (budget <= 0) break;
    }
    const wanted = Object.values(batch).reduce((a, b) => a + b, 0);
    if (!wanted) return res.json({ created: [] });

    const ctx = buildContext();
    const existingTitles = recipes.list().map((r) => r.title);
    const generated = await ai.generateRecipeProposals(ctx.meal, {
      deficit: batch,
      existingTitles,
    });

    const created = [];
    for (const recipe of generated) {
      if (!planner.SLOT_ORDER.includes(recipe.slot)) continue;
      const ingredients = parseIngredients(recipe.ingredients);
      if (!recipe.title || !ingredients.length) continue;
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
