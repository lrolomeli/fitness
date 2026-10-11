const { Router } = require('express');
const recipes = require('../db/repos/recipes');
const { estimateMacros } = require('../services/estimator');

const router = Router();

router.get('/', (req, res) => {
  res.json(recipes.list(req.query.slot));
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });

  let ingredients = body.ingredients || [];
  if (typeof ingredients === 'string') {
    ingredients = ingredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  let macros = {
    kcal: Number(body.kcal) || 0,
    protein_g: Number(body.protein_g) || 0,
    carbs_g: Number(body.carbs_g) || 0,
    fat_g: Number(body.fat_g) || 0,
  };
  if (!macros.kcal && ingredients.length) {
    macros = estimateMacros(ingredients);
  }

  const created = recipes.upsertRecipe({
    title,
    slot: body.slot || 'lunch',
    ingredients,
    servings: body.servings || 1,
    source: 'manual',
    ...macros,
  });
  res.status(201).json(created);
});

router.delete('/:id', (req, res) => {
  recipes.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
