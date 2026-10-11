const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');

function parse(row) {
  if (!row) return null;
  return { ...row, gym_marks: parseJson(row.gym_marks, []) };
}

function list() {
  return db
    .queryAll(DB_NAME, 'SELECT * FROM progress_logs ORDER BY date DESC, id DESC')
    .map(parse);
}

function add(log) {
  db.run(
    DB_NAME,
    `INSERT INTO progress_logs (date, weight_kg, calories_consumed, gym_marks, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      log.date,
      log.weight_kg ?? null,
      log.calories_consumed ?? null,
      JSON.stringify(log.gym_marks || []),
      log.notes || null,
      now(),
    ]
  );
  return parse(lastRow('progress_logs'));
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM progress_logs WHERE id = ?', [id]);
  return { success: true };
}

function summary() {
  const rows = db.queryAll(DB_NAME, 'SELECT * FROM progress_logs ORDER BY date ASC, id ASC').map(parse);
  const weights = rows
    .filter((r) => r.weight_kg != null)
    .map((r) => ({ date: r.date, value: r.weight_kg }));
  const calories = rows
    .filter((r) => r.calories_consumed != null)
    .map((r) => ({ date: r.date, value: r.calories_consumed }));

  const marks = [];
  rows.forEach((r) => {
    (r.gym_marks || []).forEach((m) => {
      marks.push({ date: r.date, exercise: m.exercise, weight_kg: m.weight_kg, reps: m.reps });
    });
  });

  return { weights, calories, marks };
}

module.exports = { list, add, remove, summary };
