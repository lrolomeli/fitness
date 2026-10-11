const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentario',
  light: 'Ligero (1-2 días)',
  moderate: 'Moderado (3-4 días)',
  high: 'Alto (5+ días)',
};

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const diff = Date.now() - born.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// Mifflin-St Jeor
function bmr(user) {
  const age = ageFromBirthDate(user.birth_date) ?? 30;
  const weight = Number(user.weight_kg) || 75;
  const height = Number(user.height_cm) || 175;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return user.sex === 'f' ? base - 161 : base + 5;
}

function tdee(user) {
  const factor = ACTIVITY_FACTORS[user.activity_level] || 1.55;
  return Math.round(bmr(user) * factor);
}

// Superávit: fase 1 +250 kcal, fase 2 +200 kcal extra (≈ +450).
function targetCalories(maintenance, phase) {
  const surplus = phase >= 2 ? 450 : 250;
  return Math.round(maintenance + surplus);
}

// Proteína ~2 g/kg, grasa ~1 g/kg, resto carbohidratos.
function macros(calories, weightKg) {
  const weight = Number(weightKg) || 75;
  const protein_g = Math.round(weight * 2);
  const fat_g = Math.round(weight * 1);
  const remaining = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remaining / 4));
  return { protein_g, carbs_g, fat_g };
}

function targetsFor(user, phase) {
  const maintenance = tdee(user);
  const calories = targetCalories(maintenance, phase);
  const m = macros(calories, user.weight_kg);
  return { maintenance, target_calories: calories, ...m };
}

module.exports = {
  ACTIVITY_FACTORS,
  ACTIVITY_LABELS,
  ageFromBirthDate,
  bmr,
  tdee,
  targetCalories,
  macros,
  targetsFor,
};
