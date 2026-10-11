// Proveedor de recetas TheMealDB (gratis, sin nutrición → se estima).
// El "key" de prueba es "1"; se puede sobreescribir con RECIPE_API_KEY.

const KEY = process.env.RECIPE_API_KEY || '1';
const BASE = `https://www.themealdb.com/api/json/v1/${KEY}/`;

const SLOT_CATEGORY = { breakfast: 'Breakfast', snack: 'Dessert' };

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`TheMealDB ${res.status}`);
  return res.json();
}

function ingredientsOf(meal) {
  const out = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) out.push({ name: name.trim(), measure: (measure || '').trim() });
  }
  return out;
}

function toCandidate(meal, slot) {
  return {
    title: meal.strMeal,
    slot,
    ingredients: ingredientsOf(meal).map((i) => `${i.measure} ${i.name}`.trim()),
    source: 'themealdb',
    source_url: meal.strSource || meal.strYoutube || null,
    servings: 2,
  };
}

function hasExcluded(meal, exclude) {
  if (!exclude || !exclude.length) return false;
  const text = ingredientsOf(meal)
    .map((i) => i.name.toLowerCase())
    .join(' ');
  return exclude.some((term) => text.includes(String(term).toLowerCase()));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function lookup(id) {
  const data = await fetchJson(`lookup.php?i=${encodeURIComponent(id)}`);
  return (data.meals && data.meals[0]) || null;
}

async function search({ slot = 'lunch', count = 5, exclude = [] } = {}) {
  const category = SLOT_CATEGORY[slot];
  const results = [];

  if (category) {
    const data = await fetchJson(`filter.php?c=${encodeURIComponent(category)}`);
    const ids = shuffle((data.meals || []).map((m) => m.idMeal)).slice(0, count + 4);
    for (const id of ids) {
      if (results.length >= count) break;
      try {
        const meal = await lookup(id);
        if (meal && !hasExcluded(meal, exclude)) results.push(toCandidate(meal, slot));
      } catch {
        // ignora fallos puntuales
      }
    }
    return results;
  }

  let attempts = 0;
  const seen = new Set();
  while (results.length < count && attempts < count * 3) {
    attempts += 1;
    try {
      const data = await fetchJson('random.php');
      const meal = data.meals && data.meals[0];
      if (!meal || seen.has(meal.idMeal) || hasExcluded(meal, exclude)) continue;
      seen.add(meal.idMeal);
      results.push(toCandidate(meal, slot));
    } catch {
      break;
    }
  }
  return results;
}

module.exports = { name: 'themealdb', search };
