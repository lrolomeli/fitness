const { db, DB_NAME, lastRow, now } = require('./helpers');
const routines = require('./routines');

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function listDays(weekId, { withRoutines = false } = {}) {
  const rows = db.queryAll(
    DB_NAME,
    `SELECT wd.*, r.name AS routine_name
       FROM training_week_days wd
       LEFT JOIN routines r ON r.id = wd.routine_id
      WHERE wd.week_id = ?
      ORDER BY wd.day ASC`,
    [weekId]
  );
  return rows.map((day) => ({
    ...day,
    is_rest: day.is_rest ? 1 : 0,
    routine: withRoutines && day.routine_id ? routines.get(day.routine_id) : null,
  }));
}

function get(id, options = {}) {
  const week = db.queryOne(DB_NAME, 'SELECT * FROM training_weeks WHERE id = ?', [id]);
  if (!week) return null;
  return {
    ...week,
    is_active: week.is_active ? 1 : 0,
    days: listDays(id, options),
  };
}

function list() {
  return db
    .queryAll(DB_NAME, 'SELECT * FROM training_weeks ORDER BY is_active DESC, created_at DESC, id DESC')
    .map((week) => ({
      ...week,
      is_active: week.is_active ? 1 : 0,
      days: listDays(week.id),
    }));
}

function getActive(options = { withRoutines: true }) {
  const week = db.queryOne(
    DB_NAME,
    'SELECT * FROM training_weeks WHERE is_active = 1 ORDER BY updated_at DESC, id DESC LIMIT 1'
  );
  if (!week) return null;
  return get(week.id, options);
}

function normalizeDays(days = []) {
  return DAYS.map((dayNumber) => {
    const found = (days || []).find((day) => Number(day.day) === dayNumber) || {};
    const routineId = found.routine_id == null ? null : Number(found.routine_id);
    const isRest = found.is_rest === true || found.is_rest === 1 || !routineId;
    return {
      day: dayNumber,
      routine_id: isRest ? null : routineId,
      is_rest: isRest ? 1 : 0,
    };
  });
}

function insertDays(weekId, days) {
  normalizeDays(days).forEach((day) => {
    db.run(
      DB_NAME,
      'INSERT INTO training_week_days (week_id, day, routine_id, is_rest) VALUES (?, ?, ?, ?)',
      [weekId, day.day, day.routine_id, day.is_rest]
    );
  });
}

function create(week = {}) {
  const name = String(week.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('El nombre de la semana es obligatorio'), { status: 400 });
  }
  const ts = now();
  db.run(
    DB_NAME,
    'INSERT INTO training_weeks (name, is_active, created_at, updated_at) VALUES (?, 0, ?, ?)',
    [name, ts, ts]
  );
  const id = lastRow('training_weeks').id;
  insertDays(id, week.days || []);
  return get(id);
}

function update(id, week = {}) {
  const current = get(id);
  if (!current) return null;

  const name = week.name !== undefined ? String(week.name).trim() : current.name;
  if (!name) {
    throw Object.assign(new Error('El nombre de la semana es obligatorio'), { status: 400 });
  }

  db.run(DB_NAME, 'UPDATE training_weeks SET name = ?, updated_at = ? WHERE id = ?', [
    name,
    now(),
    id,
  ]);

  if (Array.isArray(week.days)) {
    db.run(DB_NAME, 'DELETE FROM training_week_days WHERE week_id = ?', [id]);
    insertDays(id, week.days);
  }
  return get(id);
}

function activate(id) {
  const current = get(id);
  if (!current) return null;
  db.run(DB_NAME, 'UPDATE training_weeks SET is_active = 0 WHERE is_active = 1');
  db.run(DB_NAME, 'UPDATE training_weeks SET is_active = 1, updated_at = ? WHERE id = ?', [
    now(),
    id,
  ]);
  return get(id, { withRoutines: true });
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM training_week_days WHERE week_id = ?', [id]);
  db.run(DB_NAME, 'DELETE FROM training_weeks WHERE id = ?', [id]);
  return { success: true };
}

function currentDayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

function today(date = new Date()) {
  const active = getActive();
  const dayIndex = currentDayIndex(date);
  if (!active) return { week: null, day: dayIndex, entry: null };
  const entry = (active.days || []).find((day) => Number(day.day) === dayIndex) || null;
  return {
    week: { id: active.id, name: active.name, is_active: active.is_active },
    day: dayIndex,
    entry,
  };
}

module.exports = {
  DAYS,
  list,
  get,
  getActive,
  create,
  update,
  activate,
  remove,
  currentDayIndex,
  today,
};
