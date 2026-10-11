const users = require('../db/repos/users');
const preferences = require('../db/repos/preferences');
const meals = require('../db/repos/meals');
const recipes = require('../db/repos/recipes');
const nutrition = require('./nutrition');
const progression = require('./progression');

function byType(prefs, type) {
  return prefs.filter((p) => p.type === type).map((p) => p.value);
}

function buildContext() {
  const user = users.get() || {};
  const info = progression.blockInfo(user);
  const guidance = progression.phaseGuidance(info.phase);
  const targets = nutrition.targetsFor(user, info.phase);
  const prefs = preferences.list();
  const feedback = meals.recentFeedback();
  const library = recipes.list().slice(0, 40).map((r) => r.title);

  const meal = {
    targets,
    phase: info.phase,
    phaseName: guidance.name,
    phaseNutrition: guidance.nutrition,
    phaseTraining: guidance.training,
    phaseRir: guidance.rir,
    sex: user.sex,
    weight_kg: user.weight_kg,
    experience_level: user.experience_level,
    activity_level: user.activity_level,
    favorites: byType(prefs, 'favorite'),
    banned: byType(prefs, 'banned'),
    restrictions: byType(prefs, 'restriction'),
    liked: feedback.liked,
    disliked: feedback.disliked,
    library,
  };

  const workout = {
    ...meal,
    targets,
  };

  return { user, info, guidance, targets, meal, workout };
}

module.exports = { buildContext };
