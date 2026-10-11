const { Router } = require('express');
const users = require('../db/repos/users');
const mealPlans = require('../db/repos/mealPlans');
const recipes = require('../db/repos/recipes');
const nutrition = require('../services/nutrition');
const progression = require('../services/progression');
const ai = require('../services/ai');
const { getProvider } = require('../services/recipes');

const router = Router();

router.get('/', (req, res) => {
  const user = users.get();
  const info = progression.blockInfo(user || {});
  const guidance = progression.phaseGuidance(info.phase);
  const targets = nutrition.targetsFor(user || {}, info.phase);
  const plan = mealPlans.byWeek(progression.currentWeekStart()) || mealPlans.latest();
  const provider = getProvider();

  res.json({
    profile: user,
    block: info,
    guidance,
    targets,
    plan: plan ? { id: plan.id, week_start: plan.week_start, status: plan.status } : null,
    ai: { configured: ai.isConfigured(), model: ai.MODEL },
    recipeCount: recipes.count(),
    recipeProvider: provider ? provider.name : 'none',
    activityOptions: nutrition.ACTIVITY_FACTORS,
    activityLabels: nutrition.ACTIVITY_LABELS,
  });
});

module.exports = router;
