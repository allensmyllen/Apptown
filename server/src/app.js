const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Serve local uploads in dev mode
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Page view tracking — fire-and-forget, never blocks
const db = require('./db');
app.use((req, res, next) => {
  // Only track frontend page navigations reported by the client
  next();
});

// POST /api/track — called by the frontend on each route change
app.post('/api/track', (req, res) => {
  const { path: pagePath } = req.body;
  if (pagePath && typeof pagePath === 'string') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    db.query(
      'INSERT INTO page_views (path, ip, user_agent) VALUES ($1, $2, $3)',
      [pagePath.slice(0, 500), ip, ua]
    ).catch(() => {});
  }
  res.status(204).send();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/users', require('./routes/adminUsers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/licenses', require('./routes/licenses'));
app.use('/api/products/:productId/reviews', require('./routes/reviews'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message || err);
  const status = err.status || 500;
  // In development, surface the real DB/error message to help debugging
  const isDev = process.env.NODE_ENV !== 'production';
  const message = isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error';
  res.status(status).json({ error: message });
});

module.exports = app;
