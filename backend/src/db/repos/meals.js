const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');

function parse(row) {
  if (!row) return null;
  return { ...row, ingredients: parseJson(row.ingredients, []) };
}

function listByPlan(planId) {
  return db
    .queryAll(DB_NAME, 'SELECT * FROM meals WHERE plan_id = ? ORDER BY day ASC, id ASC', [planId])
    .map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM meals WHERE id = ?', [id]));
}

function create(meal) {
  db.run(
    DB_NAME,
    `INSERT INTO meals
      (plan_id, day, slot, title, description, ingredients, kcal, protein_g, carbs_g, fat_g, feedback, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      meal.plan_id,
      meal.day,
      meal.slot,
      meal.title,
      meal.description || null,
      JSON.stringify(meal.ingredients || []),
      meal.kcal || 0,
      meal.protein_g || 0,
      meal.carbs_g || 0,
      meal.fat_g || 0,
      meal.feedback || null,
      now(),
    ]
  );
  return get(lastRow('meals').id);
}

function update(id, changes = {}) {
  const current = get(id);
  if (!current) return null;

  const num = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  };

  const title = changes.title !== undefined ? String(changes.title).trim() : current.title;
  if (!title) throw Object.assign(new Error('El título es obligatorio'), { status: 400 });

  const ingredients = Array.isArray(changes.ingredients)
    ? changes.ingredients.map((i) => String(i).trim()).filter(Boolean)
    : current.ingredients;

  db.run(
    DB_NAME,
    `UPDATE meals
       SET title = ?, description = ?, ingredients = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    [
      title,
      changes.description !== undefined ? changes.description : current.description,
      JSON.stringify(ingredients),
      num(changes.kcal, current.kcal),
      num(changes.protein_g, current.protein_g),
      num(changes.carbs_g, current.carbs_g),
      num(changes.fat_g, current.fat_g),
      id,
    ]
  );
  return get(id);
}

function setFeedback(id, feedback) {
  db.run(DB_NAME, 'UPDATE meals SET feedback = ? WHERE id = ?', [feedback, id]);
  return get(id);
}

function recentFeedback() {
  const liked = db.queryAll(
    DB_NAME,
    "SELECT DISTINCT title FROM meals WHERE feedback = 'up' ORDER BY id DESC LIMIT 30"
  ).map((r) => r.title);
  const disliked = db.queryAll(
    DB_NAME,
    "SELECT DISTINCT title FROM meals WHERE feedback = 'down' ORDER BY id DESC LIMIT 30"
  ).map((r) => r.title);
  return { liked, disliked };
}

function listAll() {
  return db
    .queryAll(DB_NAME, 'SELECT * FROM meals ORDER BY id ASC')
    .map(parse);
}

module.exports = { listByPlan, get, create, update, setFeedback, recentFeedback, listAll };
