const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');
const muscleGroups = require('./muscleGroups');

const STATUSES = ['active', 'proposed', 'disabled'];
const MEDIA_TYPES = ['link', 'image', 'video'];

function normalize(name) {
  return String(name || '').trim().toLowerCase();
}

function parseMedia(value) {
  const parsed = parseJson(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => {
      if (typeof item === 'string') return { type: 'link', url: item };
      if (!item || typeof item !== 'object') return null;
      const url = String(item.url || '').trim();
      if (!url) return null;
      const type = MEDIA_TYPES.includes(item.type) ? item.type : 'link';
      return { type, url };
    })
    .filter(Boolean);
}

function serializeMedia(media) {
  if (!Array.isArray(media)) return '[]';
  return JSON.stringify(parseMedia(JSON.stringify(media)));
}

function parse(row) {
  if (!row) return null;
  return { ...row, media: parseMedia(row.media) };
}

function findByBlockAndName(name, block) {
  return parse(
    db.queryOne(
      DB_NAME,
      'SELECT * FROM exercise_library WHERE lower(trim(name)) = ? AND block = ? LIMIT 1',
      [normalize(name), block]
    )
  );
}

function listByStatus(status, block) {
  const filters = ['status = ?'];
  const params = [status];
  if (block) {
    filters.push('block = ?');
    params.push(block);
  }
  return db
    .queryAll(
      DB_NAME,
      `SELECT * FROM exercise_library WHERE ${filters.join(' AND ')}
       ORDER BY times_used ASC, created_at DESC`,
      params
    )
    .map(parse);
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
    return db
      .queryAll(
        DB_NAME,
        'SELECT * FROM exercise_library WHERE block = ? ORDER BY times_used ASC, created_at DESC',
        [block]
      )
      .map(parse);
  }
  return db
    .queryAll(DB_NAME, 'SELECT * FROM exercise_library ORDER BY created_at DESC')
    .map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM exercise_library WHERE id = ?', [id]));
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

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function upsertExercise(exercise) {
  const {
    name,
    block = muscleGroups.defaultKey(),
    equipment = null,
    source = 'manual',
    status,
    sets = null,
    reps = null,
    duration_seconds = null,
    notes = null,
    media = [],
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
    `INSERT INTO exercise_library
       (name, block, equipment, sets, reps, duration_seconds, notes, media, status, source, times_used, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      clean,
      block,
      equipment,
      toNullableNumber(sets),
      reps ? String(reps).trim() : null,
      toNullableNumber(duration_seconds),
      notes ? String(notes).trim() : null,
      serializeMedia(media),
      finalStatus,
      source,
      now(),
      now(),
    ]
  );
  return get(lastRow('exercise_library').id);
}

function update(id, changes = {}) {
  const current = get(id);
  if (!current) return null;

  const nextBlock =
    changes.block !== undefined && muscleGroups.exists(changes.block)
      ? changes.block
      : current.block;
  const nextName = changes.name !== undefined ? String(changes.name).trim() : current.name;
  if (!nextName) {
    throw Object.assign(new Error('El nombre es obligatorio'), { status: 400 });
  }
  if (changes.block !== undefined && !muscleGroups.exists(changes.block)) {
    throw Object.assign(new Error('Grupo muscular inválido'), { status: 400 });
  }

  db.run(
    DB_NAME,
    `UPDATE exercise_library
       SET name = ?, block = ?, equipment = ?, sets = ?, reps = ?, duration_seconds = ?,
           notes = ?, media = ?, updated_at = ?
     WHERE id = ?`,
    [
      nextName,
      nextBlock,
      changes.equipment !== undefined ? (changes.equipment ? String(changes.equipment).trim() : null) : current.equipment,
      changes.sets !== undefined ? toNullableNumber(changes.sets) : current.sets,
      changes.reps !== undefined ? (changes.reps ? String(changes.reps).trim() : null) : current.reps,
      changes.duration_seconds !== undefined
        ? toNullableNumber(changes.duration_seconds)
        : current.duration_seconds,
      changes.notes !== undefined ? (changes.notes ? String(changes.notes).trim() : null) : current.notes,
      changes.media !== undefined ? serializeMedia(changes.media) : serializeMedia(current.media),
      now(),
      id,
    ]
  );
  return get(id);
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error('Estado de ejercicio inválido'), { status: 400 });
  }
  db.run(DB_NAME, 'UPDATE exercise_library SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    now(),
    id,
  ]);
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
  db.run(DB_NAME, 'UPDATE routine_exercises SET exercise_id = NULL WHERE exercise_id = ?', [id]);
  db.run(DB_NAME, 'DELETE FROM exercise_library WHERE id = ?', [id]);
  return { success: true };
}

module.exports = {
  STATUSES,
  MEDIA_TYPES,
  parse,
  parseMedia,
  list,
  listActive,
  listProposed,
  listDisabled,
  get,
  count,
  countByStatus,
  countActiveByBlock,
  upsertExercise,
  update,
  setStatus,
  markUsed,
  remove,
};
