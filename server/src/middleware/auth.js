const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * authenticate — verify JWT and attach payload to req.user.
 * Also checks that the user is not banned/blocked on every request.
 */
async function authenticate(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Re-check user status on every authenticated request
  // This ensures banned/blocked users are locked out immediately, not after JWT expiry
  try {
    const result = await db.query(
      'SELECT status, email_verified FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = result.rows[0];
    if (user.status === 'banned')  return res.status(403).json({ error: 'Your account has been banned.' });
    if (user.status === 'blocked') return res.status(403).json({ error: 'Your account has been temporarily blocked.' });
  } catch {
    // If DB check fails, still allow — don't lock out users due to transient DB errors
  }

  req.user = payload;
  return next();
}

/**
 * requireAdmin — must be used after authenticate.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin };
