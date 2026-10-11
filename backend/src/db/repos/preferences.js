const { db, DB_NAME, lastRow, now } = require('./helpers');

const TYPES = ['favorite', 'banned', 'restriction'];

function list(type) {
  if (type) {
    return db.queryAll(
      DB_NAME,
      'SELECT * FROM preferences WHERE type = ? ORDER BY created_at DESC',
      [type]
    );
  }
  return db.queryAll(DB_NAME, 'SELECT * FROM preferences ORDER BY created_at DESC');
}

function add({ type, value, notes = '' }) {
  if (!TYPES.includes(type)) {
    throw Object.assign(new Error('Tipo de preferencia inválido'), { status: 400 });
  }
  const clean = String(value || '').trim();
  if (!clean) {
    throw Object.assign(new Error('El valor es obligatorio'), { status: 400 });
  }
  db.run(
    DB_NAME,
    'INSERT INTO preferences (type, value, notes, created_at) VALUES (?, ?, ?, ?)',
    [type, clean, notes, now()]
  );
  return lastRow('preferences');
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM preferences WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { TYPES, list, add, remove };
