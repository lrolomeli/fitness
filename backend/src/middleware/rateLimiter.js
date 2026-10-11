const rateLimit = require('express-rate-limit');

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const MAX = Number(process.env.RATE_LIMIT_MAX) || 600;

function tooManyRequests(req, res) {
  res.status(429).json({
    error: 'Demasiadas solicitudes, espera un momento e intenta de nuevo.',
  });
}

// Límite global generoso: el frontend hace varias peticiones por acción (cargar
// la sección + refrescar el estado), así que un límite bajo bloquea el uso normal.
const limiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

// Límite estricto solo para el login (anti fuerza bruta).
const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
});

module.exports = limiter;
module.exports.loginLimiter = loginLimiter;
