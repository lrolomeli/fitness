const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');

function normalize(title) {
  return String(title || '').trim().toLowerCase();
}

function parse(row) {
  if (!row) return null;
  return { ...row, ingredients: parseJson(row.ingredients, []) };
}

function findByTitle(title, slot) {
  return db.queryOne(
    DB_NAME,
    'SELECT * FROM recipes WHERE lower(trim(title)) = ? AND slot = ? LIMIT 1',
    [normalize(title), slot]
  );
}

function list(slot) {
  const rows = slot
    ? db.queryAll(
        DB_NAME,
        'SELECT * FROM recipes WHERE slot = ? ORDER BY times_suggested ASC, created_at DESC',
        [slot]
      )
    : db.queryAll(DB_NAME, 'SELECT * FROM recipes ORDER BY created_at DESC');
  return rows.map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM recipes WHERE id = ?', [id]));
}

function count() {
  const row = db.queryOne(DB_NAME, 'SELECT COUNT(*) AS n FROM recipes');
  return row ? row.n : 0;
}

function upsertRecipe(recipe) {
  const {
    title,
    slot = 'lunch',
    ingredients = [],
    kcal = 0,
    protein_g = 0,
    carbs_g = 0,
    fat_g = 0,
    servings = 1,
    source = 'manual',
    source_url = null,
  } = recipe;

  const clean = String(title || '').trim();
  if (!clean) return null;

  const existing = findByTitle(clean, slot);
  if (existing) return parse(existing);

  db.run(
    DB_NAME,
    `INSERT INTO recipes
      (title, slot, ingredients, kcal, protein_g, carbs_g, fat_g, servings, source, source_url, times_suggested, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      clean,
      slot,
      JSON.stringify(ingredients || []),
      Math.round(kcal || 0),
      Math.round(protein_g || 0),
      Math.round(carbs_g || 0),
      Math.round(fat_g || 0),
      servings || 1,
      source,
      source_url,
      now(),
    ]
  );
  return get(lastRow('recipes').id);
}

// Guarda el barrido: comidas no rechazadas (feedback != 'down').
function sweepFromMeals(meals, source = 'sweep') {
  let saved = 0;
  (meals || []).forEach((meal) => {
    if (meal.feedback === 'down') return;
    const created = upsertRecipe({
      title: meal.title,
      slot: meal.slot,
      ingredients: meal.ingredients,
      kcal: meal.kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      source,
    });
    if (created) saved += 1;
  });
  return saved;
}

function markSuggested(ids) {
  if (!ids || !ids.length) return;
  const ts = now();
  ids.forEach((id) => {
    db.run(
      DB_NAME,
      'UPDATE recipes SET times_suggested = times_suggested + 1, last_suggested_at = ? WHERE id = ?',
      [ts, id]
    );
  });
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM recipes WHERE id = ?', [id]);
  return { success: true };
}

module.exports = {
  list,
  get,
  count,
  upsertRecipe,
  sweepFromMeals,
  markSuggested,
  remove,
};
