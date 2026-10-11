const { db, DB_NAME, lastRow, now } = require('./helpers');

function list() {
  return db.queryAll(DB_NAME, 'SELECT * FROM meal_plans ORDER BY week_start DESC, id DESC');
}

function get(id) {
  return db.queryOne(DB_NAME, 'SELECT * FROM meal_plans WHERE id = ?', [id]);
}

function latest() {
  return db.queryOne(DB_NAME, 'SELECT * FROM meal_plans ORDER BY id DESC LIMIT 1');
}

function byWeek(weekStart) {
  return db.queryOne(
    DB_NAME,
    'SELECT * FROM meal_plans WHERE week_start = ? ORDER BY id DESC LIMIT 1',
    [weekStart]
  );
}

function create(plan) {
  db.run(
    DB_NAME,
    `INSERT INTO meal_plans
      (week_start, phase, target_calories, protein_g, carbs_g, fat_g, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.week_start,
      plan.phase,
      plan.target_calories,
      plan.protein_g,
      plan.carbs_g,
      plan.fat_g,
      plan.status || 'active',
      plan.notes || null,
      now(),
    ]
  );
  return get(lastRow('meal_plans').id);
}

function setStatus(id, status) {
  db.run(DB_NAME, 'UPDATE meal_plans SET status = ? WHERE id = ?', [status, id]);
  return get(id);
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM meals WHERE plan_id = ?', [id]);
  db.run(DB_NAME, 'DELETE FROM meal_plans WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { list, get, latest, byWeek, create, setStatus, remove };
