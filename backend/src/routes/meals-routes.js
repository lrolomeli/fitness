const { Router } = require('express');
const meals = require('../db/repos/meals');
const preferences = require('../db/repos/preferences');
const recipes = require('../db/repos/recipes');
const { estimateMacros } = require('../services/estimator');

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
    });
  }

  res.json(meal);
});

// El usuario elige manualmente qué vetar tras un thumbs down.
router.post('/:id/ban', (req, res) => {
  const meal = meals.get(Number(req.params.id));
  if (!meal) return res.status(404).json({ error: 'Comida no encontrada' });

  const { items, whole } = req.body || {};
  const values = whole ? [meal.title] : Array.isArray(items) ? items : [];

  if (!values.length) {
    return res.status(400).json({ error: 'Nada que vetar' });
  }

  const added = values
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return preferences.add({ type: 'banned', value, notes: `Vetado desde "${meal.title}"` });
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  res.status(201).json({ added });
});

module.exports = router;
