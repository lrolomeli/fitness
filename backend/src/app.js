const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

const limiter = require('./middleware/rateLimiter');
const { sessionMiddleware } = require('./middleware/auth');

const authRoutes = require('./routes/auth-routes');
const profileRoutes = require('./routes/profile-routes');
const preferencesRoutes = require('./routes/preferences-routes');
const plansRoutes = require('./routes/plans-routes');
const mealsRoutes = require('./routes/meals-routes');
const workoutsRoutes = require('./routes/workouts-routes');
const progressRoutes = require('./routes/progress-routes');
const recipesRoutes = require('./routes/recipes-routes');
const exercisesRoutes = require('./routes/exercises-routes');
const stateRoutes = require('./routes/state-routes');

const app = express();

// Detrás de un reverse proxy externo + nginx: confiar en loopback y rangos
// privados (Docker/host) para obtener la IP real del cliente en el rate limit.
app.set('trust proxy', 'loopback, uniquelocal');

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

app.use(limiter);
app.use(express.json());

// 🔐 session setup
app.use(session({
  name: 'fitness.sid',
  secret: SESSION_SECRET,
  store: new FileStore({
    path: process.env.SESSION_STORE_PATH || './data/sessions',
    ttl: SESSION_TTL_MS / 1000,
    retries: 0,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS
  }
}));

// =========================
// ✅ PUBLIC ROUTES
// =========================
app.use('/api/auth', authRoutes);

// =========================
// 🔒 DEFAULT DENY
// =========================
app.use('/api', sessionMiddleware);

// =========================
// 🔒 PROTECTED ROUTES
// =========================
app.use('/api/state', stateRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/progress', progressRoutes);

module.exports = app;
