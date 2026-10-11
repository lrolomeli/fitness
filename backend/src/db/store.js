const db = require('./init');

const DB_NAME = 'app';

// Módulo de ejemplo. Agrega aquí los módulos de tu proyecto.
const MODULES = ['items'];

async function init() {
  await db.init(DB_NAME);
  db.exec(
    DB_NAME,
    `CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      title TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );
}

function parse(row) {
  if (!row) return null;
  let data = {};
  try {
    data = JSON.parse(row.data || '{}');
  } catch {
    data = {};
  }
  return { ...row, data };
}

function list(module) {
  const rows = module
    ? db.queryAll(DB_NAME, 'SELECT * FROM entries WHERE module = ? ORDER BY created_at DESC', [module])
    : db.queryAll(DB_NAME, 'SELECT * FROM entries ORDER BY created_at DESC');
  return rows.map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM entries WHERE id = ?', [id]));
}

function create({ module, title, data = {} }) {
  const now = new Date().toISOString();
  db.run(
    DB_NAME,
    'INSERT INTO entries (module, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [module, title, JSON.stringify(data), now, now]
  );
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM entries ORDER BY id DESC LIMIT 1'));
}

function update(id, fields) {
  const current = get(id);
  if (!current) return null;
  const module = fields.module ?? current.module;
  const title = fields.title ?? current.title;
  const data = fields.data ?? current.data;
  const now = new Date().toISOString();
  db.run(
    DB_NAME,
    'UPDATE entries SET module = ?, title = ?, data = ?, updated_at = ? WHERE id = ?',
    [module, title, JSON.stringify(data), now, id]
  );
  return get(id);
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM entries WHERE id = ?', [id]);
  return { success: true };
}

module.exports = { MODULES, init, list, get, create, update, remove };
