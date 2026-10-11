const db = require('../init');
const { DB_NAME } = require('../schema');

function lastRow(table) {
  return db.queryOne(DB_NAME, `SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
}

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { db, DB_NAME, lastRow, now, parseJson };
