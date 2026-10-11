const { Router } = require('express');
const meals = require('../db/repos/meals');
const preferences = require('../db/repos/preferences');
const recipes = require('../db/repos/recipes');
const { estimateMacros, ingredientName } = require('../services/estimator');
const planner = require('../services/planner');
const ai = require('../services/ai');
const { buildContext } = require('../services/context');

const router = Router();

// Editar una comida del plan (título, ingredientes y macros).
router.put('/:id', (req, res) => {
  const body = req.body || {};

  let ingredients = body.ingredients;
  if (typeof ingredients === 'string') {
    ingredients = ingredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const patch = { ...body, ingredients };
  const noMacros =
    !Number(body.kcal) && !Number(body.protein_g) && !Number(body.carbs_g) && !Number(body.fat_g);
  if (Array.isArray(ingredients) && ingredients.length && noMacros) {
    Object.assign(patch, estimateMacros(ingredients));
  }

  const updated = meals.update(Number(req.params.id), patch);
  if (!updated) return res.status(404).json({ error: 'Comida no encontrada' });
  res.json(updated);
});

router.put('/:id/feedback', (req, res) => {
  const rating = req.body?.rating;
  if (!['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'rating debe ser "up" o "down"' });
  }
  const meal = meals.setFeedback(Number(req.params.id), rating);
  if (!meal) return res.status(404).json({ error: 'Comida no encontrada' });

  if (rating === 'up') {
    recipes.upsertRecipe({
      title: meal.title,
      slot: meal.slot,
      ingredients: meal.ingredients,
      kcal: meal.kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      source: 'up',
      status: 'active',
    });
  }

  res.json(meal);
});

// Guardar (un clic) una comida del plan en el recetario como activa.
router.post('/:id/save', (req, res) => {
  const meal = meals.get(Number(req.params.id));
  if (!meal) return res.status(404).json({ error: 'Comida no encontrada' });

  const saved = recipes.upsertRecipe({
    title: meal.title,
    slot: meal.slot,
    ingredients: meal.ingredients,
    kcal: meal.kcal,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    source: 'manual',
    status: 'active',
  });
  res.status(201).json(saved);
});

// Cambiar una sola comida: primero busca en el recetario; con instrucción (o si
// no hay alternativa local) pide una nueva a la IA sin guardarla.
router.post('/:id/swap', async (req, res) => {
  const meal = meals.get(Number(req.params.id));
  if (!meal) return res.status(404).json({ error: 'Comida no encontrada' });

  try {
    const instruction = String(req.body?.instruction || '').trim();
    const ctx = buildContext();
    const banned = ctx.meal.banned || [];
    const planMeals = meals.listByPlan(meal.plan_id);
    const usedTitles = planMeals.filter((m) => m.id !== meal.id).map((m) => m.title);
    const exclude = [meal.title, ...usedTitles];
    const targetKcal = Math.round(ctx.targets.target_calories * planner.SLOT_DIST[meal.slot]);

    const localPick = () => {
      const options = planner.localAlternatives(meal.slot, { banned, excludeTitles: exclude });
      if (!options.length) return null;
      const pick = options[Math.floor(Math.random() * options.length)];
      return {
        title: pick.title,
        description: 'De tu recetario',
        ingredients: pick.ingredients,
        ...planner.scaleForTarget(pick, targetKcal),
      };
    };

    const aiPick = async () => {
      const generated = await ai.generateMealSwap(ctx.meal, meal, { instruction, usedTitles: exclude });
      if (!generated) return null;
      return {
        title: generated.title,
        description: instruction ? `Ajustada: ${instruction}` : 'Alternativa IA',
        ingredients: generated.ingredients || [],
        kcal: generated.kcal || 0,
        protein_g: generated.protein_g || 0,
        carbs_g: generated.carbs_g || 0,
        fat_g: generated.fat_g || 0,
      };
    };

    let alt = null;
    if (instruction) {
      alt = await aiPick();
      if (!alt) {
        return res.status(503).json({ error: 'La IA no está disponible para el cambio solicitado' });
      }
    } else {
      alt = localPick();
      if (!alt) alt = await aiPick();
    }

    if (!alt) return res.status(422).json({ error: 'No hay otra receta disponible para cambiar' });

    meals.update(meal.id, alt);
    meals.setFeedback(meal.id, null);
    res.json(meals.get(meal.id));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// El usuario elige manualmente qué vetar tras un thumbs down.
router.post('/:id/ban', (req, res) => {
  const meal = meals.get(Number(req.params.id));
  if (!meal) return res.status(404).json({ error: 'Comida no encontrada' });

  const { items, whole } = req.body || {};
  const raw = whole ? [meal.title] : Array.isArray(items) ? items : [];
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
              notes: `Vetado desde "${meal.title}"`,
            });
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map((pref) => [pref.id, pref])
    ).values(),
  ];

  res.status(201).json({ added });
});

module.exports = router;
