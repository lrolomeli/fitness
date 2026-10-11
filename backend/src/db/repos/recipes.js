const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');

const STATUSES = ['active', 'proposed', 'disabled'];

// Clave de título: sin acentos, minúsculas, sin puntuación y espacios colapsados.
// Se usa para considerar repetidas dos recetas aunque cambien mayúsculas, acentos
// o signos, y sin importar el momento del día (slot).
function titleKey(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(row) {
  if (!row) return null;
  return { ...row, ingredients: parseJson(row.ingredients, []) };
}

function findByTitle(title) {
  const key = titleKey(title);
  if (!key) return null;
  return list().find((r) => titleKey(r.title) === key) || null;
}

function listByStatus(status, slot) {
  const filters = ['status = ?'];
  const params = [status];
  if (slot) {
    filters.push('slot = ?');
    params.push(slot);
  }
  const rows = db.queryAll(
    DB_NAME,
    `SELECT * FROM recipes WHERE ${filters.join(' AND ')}
     ORDER BY times_suggested ASC, created_at DESC`,
    params
  );
  return rows.map(parse);
}

function listActive(slot) {
  return listByStatus('active', slot);
}

function listProposed() {
  return listByStatus('proposed');
}

function listDisabled() {
  return listByStatus('disabled');
}

function list(slot) {
  const rows = slot
    ? db.queryAll(
        DB_NAME,
        'SELECT * FROM recipes WHERE slot = ? ORDER BY times_suggested ASC, created_at DESC',
        [slot]
      )
    : db.queryAll(DB_NAME, 'SELECT * FROM recipes ORDER BY created_at DESC');
  return rows.map(parse);
}

function get(id) {
  return parse(db.queryOne(DB_NAME, 'SELECT * FROM recipes WHERE id = ?', [id]));
}

function countByStatus(status) {
  const row = db.queryOne(DB_NAME, 'SELECT COUNT(*) AS n FROM recipes WHERE status = ?', [status]);
  return row ? row.n : 0;
}

function countActiveBySlot() {
  const rows = db.queryAll(
    DB_NAME,
    "SELECT slot, COUNT(*) AS n FROM recipes WHERE status = 'active' GROUP BY slot"
  );
  return rows.reduce((acc, r) => {
    acc[r.slot] = r.n;
    return acc;
  }, {});
}

function count() {
  return db.queryOne(DB_NAME, 'SELECT COUNT(*) AS n FROM recipes').n;
}

function statusForSource(source) {
  return source === 'up' || source === 'manual' ? 'active' : 'proposed';
}

function upsertRecipe(recipe) {
  const {
    title,
    slot = 'lunch',
    ingredients = [],
    kcal = 0,
    protein_g = 0,
    carbs_g = 0,
    fat_g = 0,
    servings = 1,
    source = 'manual',
    source_url = null,
    status,
  } = recipe;

  const clean = String(title || '').trim();
  if (!clean) return null;

  const existing = findByTitle(clean);
  if (existing) {
    // Nunca degradar una receta ya curada: el barrido de comidas y las
    // propuestas la reinsertan como 'proposed' y no deben des-aprobar lo que el
    // usuario ya activó. Solo se promueve a 'active' cuando se pide explícito.
    if (status === 'active' && existing.status !== 'active') {
      setStatus(existing.id, 'active');
      return get(existing.id);
    }
    return existing;
  }

  const finalStatus = STATUSES.includes(status) ? status : statusForSource(source);

  db.run(
    DB_NAME,
    `INSERT INTO recipes
      (title, slot, ingredients, kcal, protein_g, carbs_g, fat_g, servings, source, source_url, status, times_suggested, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      clean,
      slot,
      JSON.stringify(ingredients || []),
      Math.round(kcal || 0),
      Math.round(protein_g || 0),
      Math.round(carbs_g || 0),
      Math.round(fat_g || 0),
      servings || 1,
      source,
      source_url,
      finalStatus,
      now(),
    ]
  );
  return get(lastRow('recipes').id);
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error('Estado de receta inválido'), { status: 400 });
  }
  db.run(DB_NAME, 'UPDATE recipes SET status = ? WHERE id = ?', [status, id]);
  return get(id);
}

// Guarda el barrido: comidas no rechazadas (feedback != 'down') como propuestas.
function sweepFromMeals(meals, source = 'sweep') {
  let saved = 0;
  (meals || []).forEach((meal) => {
    if (meal.feedback === 'down') return;
    const created = upsertRecipe({
      title: meal.title,
      slot: meal.slot,
      ingredients: meal.ingredients,
      kcal: meal.kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      source,
      status: 'proposed',
    });
    if (created) saved += 1;
  });
  return saved;
}

function markSuggested(ids) {
  if (!ids || !ids.length) return;
  const ts = now();
  ids.forEach((id) => {
    db.run(
      DB_NAME,
      'UPDATE recipes SET times_suggested = times_suggested + 1, last_suggested_at = ? WHERE id = ?',
      [ts, id]
    );
  });
}

function remove(id) {
  db.run(DB_NAME, 'DELETE FROM recipes WHERE id = ?', [id]);
  return { success: true };
}

// Elimina recetas repetidas (mismo título normalizado, sin importar el slot).
// Conserva la mejor candidata de cada grupo: activa > propuesta > deshabilitada,
// luego la más sugerida y por último la más reciente.
const STATUS_RANK = { active: 3, proposed: 2, disabled: 1 };

function dedupe() {
  const groups = new Map();
  for (const recipe of list()) {
    const key = titleKey(recipe.title);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(recipe);
  }

  let removed = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const byStatus = (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0);
      if (byStatus) return byStatus;
      const bySuggested = (b.times_suggested || 0) - (a.times_suggested || 0);
      if (bySuggested) return bySuggested;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    for (const duplicate of group.slice(1)) {
      db.run(DB_NAME, 'DELETE FROM recipes WHERE id = ?', [duplicate.id]);
      removed += 1;
    }
  }
  return removed;
}

module.exports = {
  STATUSES,
  titleKey,
  list,
  listActive,
  listProposed,
  listDisabled,
  get,
  count,
  countByStatus,
  countActiveBySlot,
  upsertRecipe,
  setStatus,
  sweepFromMeals,
  markSuggested,
  remove,
  dedupe,
};
