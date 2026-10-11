const express = require('express');
const session = require("express-session");

const limiter = require('./middleware/rateLimiter');
const { sessionMiddleware } = require("./middleware/auth");

const authRoutes = require("./routes/auth-routes");
const itemRoutes = require('./routes/item-routes');

const app = express();

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

app.use(limiter);
app.use(express.json());

// 🔐 session setup
app.use(session({
  name: 'app.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
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
app.use('/api/items', itemRoutes);

module.exports = app;
