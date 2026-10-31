const { db, DB_NAME, lastRow, now } = require('./helpers');

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalizeLabel(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function parse(row) {
  if (!row) return null;
  return { ...row, target: Number(row.target) || 0 };
}

function list() {
  return db
    .queryAll(
      DB_NAME,
      'SELECT * FROM muscle_groups ORDER BY sort_order ASC, label COLLATE NOCASE ASC'
    )
    .map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM muscle_groups WHERE id = ?', [id]));
}

function getByKey(key) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM muscle_groups WHERE key = ?', [key]));
}

function getByLabel(label) {
  const normalized = normalizeLabel(label);
  return list().find((group) => normalizeLabel(group.label) === normalized) || null;
}

function keys() {
  return list().map((group) => group.key);
}

function labels() {
  return list().reduce((acc, group) => {
    acc[group.key] = group.label;
    return acc;
  }, {});
}

function targets() {
  return list().reduce((acc, group) => {
    acc[group.key] = group.target;
    return acc;
  }, {});
}

function exists(key) {
  return Boolean(getByKey(key));
}

function defaultKey() {
  const first = list()[0];
  return first ? first.key : null;
}

function uniqueKey(label) {
  const base = slugify(label) || 'grupo';
  let candidate = base;
  let suffix = 2;
  while (getByKey(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function toTarget(value, fallback = 6) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

function create({ label, target } = {}) {
  const clean = String(label || '').trim();
  if (!clean) {
    throw Object.assign(new Error('El nombre del grupo es obligatorio'), { status: 400 });
  }
  if (getByLabel(clean)) {
    throw Object.assign(new Error('Ya existe un grupo muscular con ese nombre'), { status: 409 });
  }

  const orderRow = db.queryOne(DB_NAME, 'SELECT MAX(sort_order) AS n FROM muscle_groups');
  const sortOrder = (orderRow?.n ?? -1) + 1;
  const ts = now();

  db.run(
    DB_NAME,
    `INSERT INTO muscle_groups (key, label, target, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uniqueKey(clean), clean, toTarget(target), sortOrder, ts, ts]
  );
  return get(lastRow('muscle_groups').id);
}

function update(id, changes = {}) {
  const current = get(id);
  if (!current) return null;

  const nextLabel = changes.label !== undefined ? String(changes.label).trim() : current.label;
  if (!nextLabel) {
    throw Object.assign(new Error('El nombre del grupo es obligatorio'), { status: 400 });
  }
  const duplicate = getByLabel(nextLabel);
  if (duplicate && duplicate.id !== current.id) {
    throw Object.assign(new Error('Ya existe un grupo muscular con ese nombre'), { status: 409 });
  }

  db.run(
    DB_NAME,
    'UPDATE muscle_groups SET label = ?, target = ?, updated_at = ? WHERE id = ?',
    [
      nextLabel,
      changes.target !== undefined ? toTarget(changes.target, current.target) : current.target,
      now(),
      id,
    ]
  );
  return get(id);
}

function countExercises(key) {
  const row = db.queryOne(
    DB_NAME,
    'SELECT COUNT(*) AS n FROM exercise_library WHERE block = ?',
    [key]
  );
  return row ? row.n : 0;
}

function remove(id, { reassign } = {}) {
  const current = get(id);
  if (!current) return null;

  const all = list();
  if (all.length <= 1) {
    throw Object.assign(new Error('Debe existir al menos un grupo muscular'), { status: 400 });
  }

  const used = countExercises(current.key);
  if (used > 0) {
    const target = reassign ? getByKey(reassign) : null;
    if (!target || target.id === current.id) {
      throw Object.assign(
        new Error(
          `Este grupo tiene ${used} ejercicio${used === 1 ? '' : 's'}. Elige otro grupo para moverlos antes de eliminarlo.`
        ),
        { status: 409, code: 'GROUP_IN_USE', count: used }
      );
    }

    db.run(DB_NAME, 'UPDATE exercise_library SET block = ?, updated_at = ? WHERE block = ?', [
      target.key,
      now(),
      current.key,
    ]);
    db.run(DB_NAME, 'UPDATE routine_exercises SET block = ? WHERE block = ?', [
      target.key,
      current.key,
    ]);
    db.run(DB_NAME, 'UPDATE exercises SET muscle = ? WHERE muscle = ?', [
      target.key,
      current.key,
    ]);
  }

  db.run(DB_NAME, 'DELETE FROM muscle_groups WHERE id = ?', [id]);
  return { success: true, moved: used };
}

module.exports = {
  normalizeLabel,
  parse,
  list,
  get,
  getByKey,
  getByLabel,
  keys,
  labels,
  targets,
  exists,
  defaultKey,
  create,
  update,
  countExercises,
  remove,
};
