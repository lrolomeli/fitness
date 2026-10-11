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

module.exports = { listByPlan, get, create, setFeedback, recentFeedback, listAll };
