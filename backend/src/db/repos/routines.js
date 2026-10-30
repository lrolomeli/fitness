const { db, DB_NAME, lastRow, now } = require('./helpers');

function listExercises(routineId) {
  return db.queryAll(
    DB_NAME,
    'SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY order_index ASC, id ASC',
    [routineId]
  );
}

function get(id) {
  const routine = db.queryOne(DB_NAME, 'SELECT * FROM routines WHERE id = ?', [id]);
  if (!routine) return null;
  return { ...routine, exercises: listExercises(id) };
}

function list() {
  const rows = db.queryAll(DB_NAME, 'SELECT * FROM routines ORDER BY created_at DESC, id DESC');
  return rows.map((routine) => ({ ...routine, exercises: listExercises(routine.id) }));
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanExercise(exercise, index) {
  return {
    exercise_id: exercise.exercise_id == null ? null : Number(exercise.exercise_id),
    name: String(exercise.name || '').trim(),
    block: exercise.block ? String(exercise.block).trim() : null,
    sets: toNullableNumber(exercise.sets),
    reps: exercise.reps ? String(exercise.reps).trim() : null,
    duration_seconds: toNullableNumber(exercise.duration_seconds),
    notes: exercise.notes ? String(exercise.notes).trim() : null,
    order_index: index,
  };
}

function insertExercises(routineId, exercises = []) {
  exercises
    .map(cleanExercise)
    .filter((exercise) => exercise.name)
    .forEach((exercise) => {
      db.run(
        DB_NAME,
        `INSERT INTO routine_exercises
           (routine_id, exercise_id, name, block, sets, reps, duration_seconds, notes, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routineId,
          exercise.exercise_id,
          exercise.name,
          exercise.block,
          exercise.sets,
          exercise.reps,
          exercise.duration_seconds,
          exercise.notes,
          exercise.order_index,
        ]
      );
    });
}

function create(routine = {}, exercises = []) {
  const name = String(routine.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('El nombre de la rutina es obligatorio'), { status: 400 });
  }
  const ts = now();
  db.run(
    DB_NAME,
    'INSERT INTO routines (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name, routine.description ? String(routine.description).trim() : null, ts, ts]
  );
  const id = lastRow('routines').id;
  insertExercises(id, exercises);
  return get(id);
}

function update(id, routine = {}, exercises) {
  const current = get(id);
  if (!current) return null;

  const name = routine.name !== undefined ? String(routine.name).trim() : current.name;
  if (!name) {
    throw Object.assign(new Error('El nombre de la rutina es obligatorio'), { status: 400 });
  }

  db.run(
    DB_NAME,
    'UPDATE routines SET name = ?, description = ?, updated_at = ? WHERE id = ?',
    [
      name,
      routine.description !== undefined
        ? routine.description
          ? String(routine.description).trim()
          : null
        : current.description,
      now(),
      id,
    ]
  );

  if (Array.isArray(exercises)) {
    db.run(DB_NAME, 'DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
    insertExercises(id, exercises);
  }
  return get(id);
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
  db.run(
    DB_NAME,
    'UPDATE training_week_days SET routine_id = NULL, is_rest = 1 WHERE routine_id = ?',
    [id]
  );
  db.run(DB_NAME, 'DELETE FROM routines WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { list, get, create, update, remove };
