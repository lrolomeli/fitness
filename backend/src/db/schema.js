const db = require('./init');

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
  times_suggested INTEGER NOT NULL DEFAULT 0,
  last_suggested_at TEXT,
  created_at TEXT NOT NULL
);
`;

async function init() {
  await db.init(DB_NAME);
  db.exec(DB_NAME, SCHEMA);
}

module.exports = { DB_NAME, init };
