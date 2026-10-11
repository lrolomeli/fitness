const { Router } = require('express');
const users = require('../db/repos/users');
const mealPlans = require('../db/repos/mealPlans');
const recipes = require('../db/repos/recipes');
const nutrition = require('../services/nutrition');
const progression = require('../services/progression');
const ai = require('../services/ai');
const planner = require('../services/planner');
const workoutPlanner = require('../services/workoutPlanner');
const exerciseLibrary = require('../db/repos/exerciseLibrary');
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
    recipeCoverage: planner.coverageBySlot(),
    recipeTargets: planner.SLOT_TARGETS,
    poolTarget: planner.POOL_TARGET,
    proposedCount: recipes.countByStatus('proposed'),
    exerciseCoverage: workoutPlanner.coverageByBlock(),
    exerciseTargets: workoutPlanner.BLOCK_TARGETS,
    exercisePoolTarget: workoutPlanner.POOL_TARGET,
    proposedExerciseCount: exerciseLibrary.countByStatus('proposed'),
    recipeProvider: provider ? provider.name : 'none',
    activityOptions: nutrition.ACTIVITY_FACTORS,
    activityLabels: nutrition.ACTIVITY_LABELS,
  });
});

module.exports = router;
