const { db, DB_NAME, lastRow, now } = require('./helpers');

function listByWeek(weekStart) {
  const workouts = db.queryAll(
    DB_NAME,
    'SELECT * FROM workouts WHERE week_start = ? ORDER BY day ASC, id ASC',
    [weekStart]
  );
  return workouts.map((w) => ({ ...w, exercises: listExercises(w.id) }));
}

function latestWeekStart() {
  const row = db.queryOne(DB_NAME, 'SELECT week_start FROM workouts ORDER BY week_start DESC LIMIT 1');
  return row ? row.week_start : null;
}

function get(id) {
  const workout = db.queryOne(DB_NAME, 'SELECT * FROM workouts WHERE id = ?', [id]);
  if (!workout) return null;
  return { ...workout, exercises: listExercises(id) };
}

function listExercises(workoutId) {
  return db.queryAll(
    DB_NAME,
    'SELECT * FROM exercises WHERE workout_id = ? ORDER BY order_index ASC, id ASC',
    [workoutId]
  );
}

function create(workout, exercises = []) {
  db.run(
    DB_NAME,
    `INSERT INTO workouts (week_start, day, phase, type, title, focus, rir, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      workout.week_start,
      workout.day,
      workout.phase,
      workout.type,
      workout.title || null,
      workout.focus || null,
      workout.rir || null,
      now(),
    ]
  );
  const id = lastRow('workouts').id;
  exercises.forEach((ex, index) => {
    db.run(
      DB_NAME,
      `INSERT INTO exercises (workout_id, name, muscle, sets, reps, suggested_weight_kg, rir, order_index, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ex.name,
        ex.muscle || null,
        ex.sets || null,
        ex.reps || null,
        ex.suggested_weight_kg ?? null,
        ex.rir || null,
        index,
        ex.notes || null,
      ]
    );
  });
  return get(id);
}

function replaceExercises(workoutId, exercises = []) {
  db.run(DB_NAME, 'DELETE FROM exercises WHERE workout_id = ?', [workoutId]);
  exercises.forEach((ex, index) => {
    db.run(
      DB_NAME,
      `INSERT INTO exercises (workout_id, name, muscle, sets, reps, suggested_weight_kg, rir, order_index, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workoutId,
        ex.name,
        ex.muscle || null,
        ex.sets || null,
        ex.reps || null,
        ex.suggested_weight_kg ?? null,
        ex.rir || null,
        index,
        ex.notes || null,
      ]
    );
  });
  return get(workoutId);
}

function removeByWeek(weekStart) {
  const workouts = db.queryAll(DB_NAME, 'SELECT id FROM workouts WHERE week_start = ?', [weekStart]);
  workouts.forEach((w) => {
    db.run(DB_NAME, 'DELETE FROM exercises WHERE workout_id = ?', [w.id]);
  });
  db.run(DB_NAME, 'DELETE FROM workouts WHERE week_start = ?', [weekStart]);
  return { success: true };
}

module.exports = { listByWeek, latestWeekStart, get, create, replaceExercises, removeByWeek };
