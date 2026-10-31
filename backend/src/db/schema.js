const db = require('./init');
const { ingredientName } = require('../services/estimator');

const DB_NAME = 'fitness';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  name TEXT,
  sex TEXT,
  birth_date TEXT,
  height_cm REAL,
  weight_kg REAL,
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  goal TEXT NOT NULL DEFAULT 'muscle_gain',
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  target_calories INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fat_g INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  slot TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL DEFAULT '[]',
  kcal INTEGER NOT NULL DEFAULT 0,
  protein_g INTEGER NOT NULL DEFAULT 0,
  carbs_g INTEGER NOT NULL DEFAULT 0,
  fat_g INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  day INTEGER NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'training',
  title TEXT,
  focus TEXT,
  rir TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  muscle TEXT,
  sets INTEGER,
  reps TEXT,
  suggested_weight_kg REAL,
  rir TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 6,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS exercise_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  block TEXT NOT NULL DEFAULT 'empuje',
  equipment TEXT,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  notes TEXT,
  media TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'seed',
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL,
  exercise_id INTEGER,
  name TEXT NOT NULL,
  block TEXT,
  sets INTEGER,
  reps TEXT,
  duration_seconds INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS training_weeks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_week_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  routine_id INTEGER,
  is_rest INTEGER NOT NULL DEFAULT 0,
  UNIQUE (week_id, day)
);

CREATE TABLE IF NOT EXISTS exercise_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER,
  exercise_name TEXT NOT NULL,
  date TEXT NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  sets INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  weight_kg REAL,
  calories_consumed INTEGER,
  gym_marks TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slot TEXT NOT NULL DEFAULT 'lunch',
  ingredients TEXT NOT NULL DEFAULT '[]',
  kcal INTEGER NOT NULL DEFAULT 0,
  protein_g INTEGER NOT NULL DEFAULT 0,
  carbs_g INTEGER NOT NULL DEFAULT 0,
  fat_g INTEGER NOT NULL DEFAULT 0,
  servings REAL NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  times_suggested INTEGER NOT NULL DEFAULT 0,
  last_suggested_at TEXT,
  created_at TEXT NOT NULL
);
`;

function prefKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Saneado idempotente de vetos antiguos: deja solo el ingrediente (sin
// cantidades) y elimina duplicados (conserva el más antiguo).
function sanitizeBannedPreferences() {
  const rows = db.queryAll(
    DB_NAME,
    "SELECT * FROM preferences WHERE type = 'banned' ORDER BY id ASC"
  );
  const seen = new Set();
  for (const row of rows) {
    const clean = ingredientName(row.value) || String(row.value || '').trim();
    const key = prefKey(clean);
    if (!key || seen.has(key)) {
      db.run(DB_NAME, 'DELETE FROM preferences WHERE id = ?', [row.id]);
      continue;
    }
    seen.add(key);
    if (clean !== row.value) {
      db.run(DB_NAME, 'UPDATE preferences SET value = ? WHERE id = ?', [clean, row.id]);
    }
  }
}

// Migraciones ligeras para bases de datos ya existentes (sql.js no altera
// tablas con CREATE TABLE IF NOT EXISTS).
function addColumnIfMissing(table, column, definition) {
  const columns = db.queryAll(DB_NAME, `PRAGMA table_info(${table})`).map((c) => c.name);
  if (!columns.includes(column)) {
    db.exec(DB_NAME, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

const DEFAULT_MUSCLE_GROUPS = [
  { key: 'empuje', label: 'Empuje', target: 8 },
  { key: 'traccion', label: 'Tracción', target: 8 },
  { key: 'pierna', label: 'Pierna', target: 8 },
  { key: 'core', label: 'Core', target: 6 },
];

// Solo se siembran si la tabla está vacía: así los grupos eliminados por el
// usuario no reaparecen al reiniciar el servidor.
function seedMuscleGroups() {
  const row = db.queryOne(DB_NAME, 'SELECT COUNT(*) AS n FROM muscle_groups');
  if (row && row.n > 0) return;

  const ts = new Date().toISOString();
  DEFAULT_MUSCLE_GROUPS.forEach((group, index) => {
    db.run(
      DB_NAME,
      `INSERT INTO muscle_groups (key, label, target, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [group.key, group.label, group.target, index, ts, ts]
    );
  });
}

function migrate() {
  const columns = db.queryAll(DB_NAME, 'PRAGMA table_info(recipes)').map((c) => c.name);
  if (!columns.includes('status')) {
    db.exec(DB_NAME, "ALTER TABLE recipes ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    // Las recetas que el usuario guardó explícitamente quedan activas; el resto
    // (barridos, proveedor, IA) pasan a propuestas.
    db.exec(DB_NAME, "UPDATE recipes SET status = 'active' WHERE source IN ('up', 'manual')");
    db.exec(DB_NAME, "UPDATE recipes SET status = 'proposed' WHERE source NOT IN ('up', 'manual')");
  }

  addColumnIfMissing('exercise_library', 'sets', 'INTEGER');
  addColumnIfMissing('exercise_library', 'reps', 'TEXT');
  addColumnIfMissing('exercise_library', 'duration_seconds', 'INTEGER');
  addColumnIfMissing('exercise_library', 'notes', 'TEXT');
  addColumnIfMissing('exercise_library', 'media', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing('exercise_library', 'updated_at', 'TEXT');

  sanitizeBannedPreferences();
}

async function init() {
  await db.init(DB_NAME);
  db.exec(DB_NAME, SCHEMA);
  migrate();
  seedMuscleGroups();
}

module.exports = { DB_NAME, init };
