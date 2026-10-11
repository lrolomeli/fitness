const recipes = require('../db/repos/recipes');
const { estimateMacros } = require('./estimator');
const { getProvider } = require('./recipes');

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_DIST = {
  breakfast: 0.28,
  lunch: 0.34,
  dinner: 0.28,
  snack: 0.1,
};

// Semillas para completar la variedad cuando el recetario/proveedor no alcanza
// las 7 opciones por momento del día.
const SEED = [
  { slot: 'breakfast', title: 'Avena con plátano y crema de cacahuate', ingredients: ['80g avena', '1 plátano', '15g crema de cacahuate', '240ml leche'] },
  { slot: 'breakfast', title: 'Omelette de huevo con espinaca y pan integral', ingredients: ['3 huevo', '80g espinaca', '2 rebanadas pan integral'] },
  { slot: 'breakfast', title: 'Yogur griego con granola y fresas', ingredients: ['170g yogur griego', '40g granola', '100g fresa'] },
  { slot: 'breakfast', title: 'Tostadas de aguacate con huevo', ingredients: ['2 rebanadas pan integral', '100g aguacate', '2 huevo'] },
  { slot: 'breakfast', title: 'Hot cakes de avena con yogur', ingredients: ['60g avena', '2 huevo', '100g yogur griego', '1 plátano'] },
  { slot: 'breakfast', title: 'Sándwich de huevo y queso', ingredients: ['2 rebanadas pan integral', '2 huevo', '30g queso', '1 jitomate'] },
  { slot: 'breakfast', title: 'Batido verde con proteína', ingredients: ['30g proteína', '1 plátano', '80g espinaca', '240ml leche'] },
  { slot: 'lunch', title: 'Pechuga de pollo con arroz y verduras', ingredients: ['170g pechuga de pollo', '150g arroz', '120g brócoli', '80g zanahoria'] },
  { slot: 'lunch', title: 'Carne de res con papa y ensalada', ingredients: ['150g carne de res', '150g papa', '60g lechuga', '120g jitomate'] },
  { slot: 'lunch', title: 'Bowl de salmón con quinoa', ingredients: ['150g salmón', '80g quinoa', '100g aguacate', '80g espinaca'] },
  { slot: 'lunch', title: 'Tacos de pescado a la plancha', ingredients: ['150g pescado', '3 tortilla', '80g repollo', '1 limón'] },
  { slot: 'lunch', title: 'Pollo al curry con arroz', ingredients: ['170g pechuga de pollo', '150g arroz', '120g verduras', '30ml leche de coco'] },
  { slot: 'lunch', title: 'Bowl de res con frijoles', ingredients: ['150g carne de res', '120g frijol', '150g arroz', '60g lechuga'] },
  { slot: 'lunch', title: 'Wrap de pavo y aguacate', ingredients: ['3 tortilla', '150g pavo', '80g aguacate', '60g lechuga'] },
  { slot: 'dinner', title: 'Tilapia con camote y ejotes', ingredients: ['150g pescado', '150g camote', '100g ejote'] },
  { slot: 'dinner', title: 'Pasta integral con pavo y tomate', ingredients: ['80g pasta', '150g pavo', '120g tomate'] },
  { slot: 'dinner', title: 'Revuelto de huevo con frijoles', ingredients: ['3 huevo', '120g frijol', '2 rebanadas pan integral'] },
  { slot: 'dinner', title: 'Ensalada de atún con garbanzos', ingredients: ['120g atún', '120g garbanzo', '60g lechuga', '10g aceite'] },
  { slot: 'dinner', title: 'Salmón al horno con verduras', ingredients: ['150g salmón', '120g brócoli', '100g jitomate', '10g aceite'] },
  { slot: 'dinner', title: 'Omelette de claras con pavo', ingredients: ['4 claras de huevo', '120g pavo', '80g espinaca'] },
  { slot: 'dinner', title: 'Bowl de atún con arroz', ingredients: ['120g atún', '150g arroz', '60g lechuga', '80g jitomate'] },
  { slot: 'snack', title: 'Batido de proteína con leche', ingredients: ['30g proteína', '240ml leche'] },
  { slot: 'snack', title: 'Manzana con almendras', ingredients: ['1 manzana', '30g almendra'] },
  { slot: 'snack', title: 'Yogur con nueces', ingredients: ['170g yogur', '30g nuez'] },
  { slot: 'snack', title: 'Requesón con miel y nueces', ingredients: ['150g requesón', '10g miel', '20g nuez'] },
  { slot: 'snack', title: 'Plátano con crema de cacahuate', ingredients: ['1 plátano', '20g crema de cacahuate'] },
  { slot: 'snack', title: 'Huevos duros', ingredients: ['3 huevo'] },
  { slot: 'snack', title: 'Yogur griego con avena', ingredients: ['170g yogur griego', '30g avena'] },
];

const SEED_RECIPES = SEED.map((s) => ({
  ...s,
  servings: 1,
  source: 'seed',
  ...estimateMacros(s.ingredients),
}));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function textOf(recipe) {
  return `${recipe.title} ${(recipe.ingredients || []).join(' ')}`.toLowerCase();
}

function isBanned(recipe, banned) {
  if (!banned || !banned.length) return false;
  const text = textOf(recipe);
  return banned.some((term) => text.includes(String(term).toLowerCase()));
}

function scaleForTarget(recipe, targetKcal) {
  const perServing = Math.max(1, Number(recipe.servings) || 1);
  const baseKcal = (recipe.kcal || 0) / perServing;
  if (baseKcal <= 0) {
    return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  }
  let factor = targetKcal / baseKcal;
  factor = Math.round(Math.min(3, Math.max(0.5, factor)) * 10) / 10;
  return {
    kcal: Math.round(baseKcal * factor),
    protein_g: Math.round((recipe.protein_g || 0) / perServing * factor),
    carbs_g: Math.round((recipe.carbs_g || 0) / perServing * factor),
    fat_g: Math.round((recipe.fat_g || 0) / perServing * factor),
  };
}

async function poolForSlot(slot, banned) {
  const pool = recipes.list(slot).filter((r) => !isBanned(r, banned));

  const provider = getProvider();
  if (pool.length < 7 && provider) {
    try {
      const external = await provider.search({ slot, count: 7 - pool.length, exclude: banned });
      external.forEach((c) => {
        const macros = estimateMacros(c.ingredients);
        pool.push({
          title: c.title,
          slot,
          ingredients: c.ingredients,
          servings: c.servings || 1,
          source: c.source,
          source_url: c.source_url,
          ...macros,
        });
      });
    } catch {
      // sin red / proveedor caído → seguimos con la biblioteca local
    }
  }

  // Completa hasta 7 opciones con las semillas para garantizar variedad en la
  // semana (evita repetir el mismo desayuno/cena todos los días).
  if (pool.length < 7) {
    const seen = new Set(pool.map((r) => String(r.title).trim().toLowerCase()));
    for (const seed of SEED_RECIPES.filter((s) => s.slot === slot)) {
      if (pool.length >= 7) break;
      const key = seed.title.trim().toLowerCase();
      if (seen.has(key) || isBanned(seed, banned)) continue;
      seen.add(key);
      pool.push(seed);
    }
  }

  return pool;
}

async function generateMealPlan(ctx) {
  const targets = ctx.targets;
  const banned = ctx.banned || [];

  const pools = {};
  for (const slot of SLOT_ORDER) {
    pools[slot] = shuffle(await poolForSlot(slot, banned));
  }

  const days = [];
  const cursor = {};

  for (let day = 0; day < 7; day += 1) {
    const dayMeals = [];
    for (const slot of SLOT_ORDER) {
      const pool = pools[slot];
      if (!pool.length) continue;
      const idx = (cursor[slot] || 0) % pool.length;
      const recipe = pool[idx];
      cursor[slot] = (cursor[slot] || 0) + 1;

      const targetKcal = Math.round(targets.target_calories * SLOT_DIST[slot]);
      const scaled = scaleForTarget(recipe, targetKcal);

      dayMeals.push({
        slot,
        title: recipe.title,
        description:
          recipe.source === 'themealdb'
            ? 'Receta de TheMealDB (macros estimados)'
            : recipe.source === 'seed'
              ? 'Sugerencia base'
              : 'De tu recetario',
        ingredients: recipe.ingredients,
        ...scaled,
      });
    }
    days.push({ day, meals: dayMeals });
  }

  return { days, provider: getProvider() ? getProvider().name : null };
}

module.exports = { generateMealPlan, SLOT_ORDER, SLOT_DIST };
