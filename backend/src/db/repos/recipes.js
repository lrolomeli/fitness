const { db, DB_NAME, lastRow, now, parseJson } = require('./helpers');

const STATUSES = ['active', 'proposed', 'disabled'];

function normalize(title) {
  return String(title || '').trim().toLowerCase();
}

function parse(row) {
  if (!row) return null;
  return { ...row, ingredients: parseJson(row.ingredients, []) };
}

function findByTitle(title, slot) {
  return db.queryOne(
    DB_NAME,
    'SELECT * FROM recipes WHERE lower(trim(title)) = ? AND slot = ? LIMIT 1',
    [normalize(title), slot]
  );
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

  const existing = findByTitle(clean, slot);
  if (existing) {
    if (status && STATUSES.includes(status) && status !== existing.status) {
      setStatus(existing.id, status);
      return get(existing.id);
    }
    return parse(existing);
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

module.exports = {
  STATUSES,
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
};
