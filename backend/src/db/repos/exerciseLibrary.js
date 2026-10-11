const { db, DB_NAME, lastRow, now } = require('./helpers');

const STATUSES = ['active', 'proposed', 'disabled'];
const BLOCKS = ['empuje', 'traccion', 'pierna', 'core'];

function normalize(name) {
  return String(name || '').trim().toLowerCase();
}

function findByBlockAndName(name, block) {
  return db.queryOne(
    DB_NAME,
    'SELECT * FROM exercise_library WHERE lower(trim(name)) = ? AND block = ? LIMIT 1',
    [normalize(name), block]
  );
}

function listByStatus(status, block) {
  const filters = ['status = ?'];
  const params = [status];
  if (block) {
    filters.push('block = ?');
    params.push(block);
  }
  return db.queryAll(
    DB_NAME,
    `SELECT * FROM exercise_library WHERE ${filters.join(' AND ')}
     ORDER BY times_used ASC, created_at DESC`,
    params
  );
}

function listActive(block) {
  return listByStatus('active', block);
}

function listProposed() {
  return listByStatus('proposed');
}

function listDisabled() {
  return listByStatus('disabled');
}

function list(block) {
  if (block) {
    return db.queryAll(
      DB_NAME,
      'SELECT * FROM exercise_library WHERE block = ? ORDER BY times_used ASC, created_at DESC',
      [block]
    );
  }
  return db.queryAll(DB_NAME, 'SELECT * FROM exercise_library ORDER BY created_at DESC');
}

function get(id) {
  return db.queryOne(DB_NAME, 'SELECT * FROM exercise_library WHERE id = ?', [id]);
}

function countByStatus(status) {
  const row = db.queryOne(
    DB_NAME,
    'SELECT COUNT(*) AS n FROM exercise_library WHERE status = ?',
    [status]
  );
  return row ? row.n : 0;
}

function countActiveByBlock() {
  const rows = db.queryAll(
    DB_NAME,
    "SELECT block, COUNT(*) AS n FROM exercise_library WHERE status = 'active' GROUP BY block"
  );
  return rows.reduce((acc, r) => {
    acc[r.block] = r.n;
    return acc;
  }, {});
}

function count() {
  return db.queryOne(DB_NAME, 'SELECT COUNT(*) AS n FROM exercise_library').n;
}

function upsertExercise(exercise) {
  const {
    name,
    block = 'empuje',
    equipment = null,
    source = 'manual',
    status,
  } = exercise;

  const clean = String(name || '').trim();
  if (!clean) return null;

  const existing = findByBlockAndName(clean, block);
  if (existing) {
    if (status && STATUSES.includes(status) && status !== existing.status) {
      setStatus(existing.id, status);
      return get(existing.id);
    }
    return existing;
  }

  const finalStatus = STATUSES.includes(status) ? status : source === 'seed' ? 'active' : 'proposed';

  db.run(
    DB_NAME,
    `INSERT INTO exercise_library (name, block, equipment, status, source, times_used, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [clean, block, equipment, finalStatus, source, now()]
  );
  return get(lastRow('exercise_library').id);
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error('Estado de ejercicio inválido'), { status: 400 });
  }
  db.run(DB_NAME, 'UPDATE exercise_library SET status = ? WHERE id = ?', [status, id]);
  return get(id);
}

function markUsed(ids) {
  if (!ids || !ids.length) return;
  const ts = now();
  ids.forEach((id) => {
    db.run(
      DB_NAME,
      'UPDATE exercise_library SET times_used = times_used + 1, last_used_at = ? WHERE id = ?',
      [ts, id]
    );
  });
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM exercise_library WHERE id = ?', [id]);
  return { success: true };
}

module.exports = {
  STATUSES,
  BLOCKS,
  list,
  listActive,
  listProposed,
  listDisabled,
  get,
  count,
  countByStatus,
  countActiveByBlock,
  upsertExercise,
  setStatus,
  markUsed,
  remove,
};
