const { db, DB_NAME, lastRow, now } = require('./helpers');
const { ingredientName } = require('../../services/estimator');

const TYPES = ['favorite', 'banned', 'restriction'];

// Clave de comparación: sin acentos, minúsculas y espacios colapsados.
function keyOf(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

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
  let clean = String(value || '').trim();
  if (!clean) {
    throw Object.assign(new Error('El valor es obligatorio'), { status: 400 });
  }
  // Los vetos guardan solo el ingrediente, sin cantidades ("170g pollo" → "pollo").
  if (type === 'banned') clean = ingredientName(clean) || clean;

  // No duplicar preferencias: si ya existe una igual (ignorando acentos y
  // mayúsculas), se devuelve la existente.
  const key = keyOf(clean);
  const existing = db
    .queryAll(DB_NAME, 'SELECT * FROM preferences WHERE type = ?', [type])
    .find((p) => keyOf(p.value) === key);
  if (existing) return existing;

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
