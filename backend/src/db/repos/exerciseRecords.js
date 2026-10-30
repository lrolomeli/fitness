const { db, DB_NAME, lastRow, now } = require('./helpers');

function parse(row) {
  if (!row) return null;
  const weight = row.weight_kg == null ? null : Number(row.weight_kg);
  const reps = row.reps == null ? null : Number(row.reps);
  return {
    ...row,
    weight_kg: weight,
    reps,
    estimated_1rm: weight && reps ? Math.round(weight * (1 + reps / 30) * 10) / 10 : null,
  };
}

function listByExercise(exerciseId) {
  return db
    .queryAll(
      DB_NAME,
      'SELECT * FROM exercise_records WHERE exercise_id = ? ORDER BY date DESC, id DESC',
      [exerciseId]
    )
    .map(parse);
}

function bestFor(exerciseId) {
  const rows = db
    .queryAll(
      DB_NAME,
      `SELECT * FROM exercise_records
        WHERE exercise_id = ? AND weight_kg IS NOT NULL
        ORDER BY weight_kg DESC, reps DESC, date DESC
        LIMIT 1`,
      [exerciseId]
    )
    .map(parse);
  return rows[0] || null;
}

function bestMap(exerciseIds = []) {
  const ids = [...new Set(exerciseIds.filter((id) => id != null).map(Number))];
  const map = {};
  ids.forEach((id) => {
    const best = bestFor(id);
    if (best) map[id] = best;
  });
  return map;
}

function add(record = {}) {
  const exerciseId = record.exercise_id == null ? null : Number(record.exercise_id);
  const name = String(record.exercise_name || '').trim();
  if (!exerciseId && !name) {
    throw Object.assign(new Error('El ejercicio es obligatorio'), { status: 400 });
  }

  const weight = record.weight_kg === '' || record.weight_kg == null ? null : Number(record.weight_kg);
  const reps = record.reps === '' || record.reps == null ? null : Number(record.reps);
  const sets = record.sets === '' || record.sets == null ? null : Number(record.sets);

  const previous = exerciseId ? bestFor(exerciseId) : null;
  const isNewRecord =
    weight != null &&
    (!previous ||
      weight > Number(previous.weight_kg) ||
      (weight === Number(previous.weight_kg) && (reps || 0) > (Number(previous.reps) || 0)));

  db.run(
    DB_NAME,
    `INSERT INTO exercise_records
       (exercise_id, exercise_name, date, weight_kg, reps, sets, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exerciseId,
      name || (previous ? previous.exercise_name : 'Ejercicio'),
      record.date || new Date().toISOString().slice(0, 10),
      Number.isFinite(weight) ? weight : null,
      Number.isFinite(reps) ? reps : null,
      Number.isFinite(sets) ? sets : null,
      record.notes ? String(record.notes).trim() : null,
      now(),
    ]
  );

  return {
    record: parse(lastRow('exercise_records')),
    isNewRecord,
    previous,
    best: exerciseId ? bestFor(exerciseId) : null,
  };
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM exercise_records WHERE id = ?', [id]);
  return { success: true };
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM exercise_records WHERE id = ?', [id]));
}

module.exports = { listByExercise, bestFor, bestMap, add, remove, get };
