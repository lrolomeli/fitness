const { Router } = require('express');
const mealPlans = require('../db/repos/mealPlans');
const meals = require('../db/repos/meals');
const recipes = require('../db/repos/recipes');
const planner = require('../services/planner');
const { getProvider } = require('../services/recipes');
const { buildContext } = require('../services/context');
const progression = require('../services/progression');

const router = Router();

router.get('/', (req, res) => {
  res.json(mealPlans.list());
});

router.get('/:id', (req, res) => {
  const plan = mealPlans.get(Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
  res.json({ ...plan, meals: meals.listByPlan(plan.id) });
});

router.post('/generate', async (req, res) => {
  const weekStart = req.body?.week_start || progression.currentWeekStart();
  try {
    // Barrido: guarda en el recetario (como propuestas) las comidas no rechazadas.
    recipes.sweepFromMeals(meals.listAll(), 'sweep');

    const ctx = buildContext();
    const deficit = planner.poolDeficit();
    const missing = Object.values(deficit).reduce((a, b) => a + b, 0);

    // La semana se arma SOLO con el recetario curado (activas) + proveedor/semillas.
    const generated = await planner.generateMealPlan(ctx.meal);

    const provider = getProvider();
    const source = provider
      ? `recetario + ${provider.name} (macros estimados)`
      : 'recetario local';

    const plan = mealPlans.create({
      week_start: weekStart,
      phase: ctx.info.phase,
      target_calories: ctx.targets.target_calories,
      protein_g: ctx.targets.protein_g,
      carbs_g: ctx.targets.carbs_g,
      fat_g: ctx.targets.fat_g,
      status: 'active',
      notes: `Generado desde ${source}`,
    });

    (generated.days || []).forEach((day) => {
      (day.meals || []).forEach((meal) => {
        meals.create({ plan_id: plan.id, day: day.day, ...meal });
      });
    });

    res.status(201).json({ ...plan, meals: meals.listByPlan(plan.id), missing });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  mealPlans.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
