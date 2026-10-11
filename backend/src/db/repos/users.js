const { db, DB_NAME, now } = require('./helpers');

const FIELDS = [
  'username',
  'name',
  'sex',
  'birth_date',
  'height_cm',
  'weight_kg',
  'activity_level',
  'experience_level',
  'goal',
  'start_date',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function get() {
  return db.queryOne(DB_NAME, 'SELECT * FROM users WHERE id = 1');
}

function save(input = {}) {
  const existing = get();
  const ts = now();

  const values = FIELDS.map((field) => {
    if (input[field] !== undefined) return input[field];
    if (existing && existing[field] !== undefined && existing[field] !== null) return existing[field];
    if (field === 'start_date') return today();
    if (field === 'activity_level') return 'moderate';
    if (field === 'experience_level') return 'beginner';
    if (field === 'goal') return 'muscle_gain';
    return null;
  });

  if (!existing) {
    db.run(
      DB_NAME,
      `INSERT INTO users (${FIELDS.join(', ')}, created_at, updated_at)
       VALUES (${FIELDS.map(() => '?').join(', ')}, ?, ?)`,
      [...values, ts, ts]
    );
  } else {
    db.run(
      DB_NAME,
      `UPDATE users SET ${FIELDS.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE id = 1`,
      [...values, ts]
    );
  }

  return get();
}

module.exports = { FIELDS, get, save };
