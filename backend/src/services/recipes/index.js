const themealdb = require('./themealdb');

const PROVIDERS = { themealdb };

function getProvider() {
  const name = (process.env.RECIPE_PROVIDER || 'themealdb').toLowerCase();
  return PROVIDERS[name] || null;
}

module.exports = { getProvider };
