const jwt = require('jsonwebtoken');

/**
 * authenticate — extract JWT from cookie or Authorization header,
 * verify it, and attach the decoded payload to req.user.
 * Returns 401 if the token is missing or invalid.
 */
function authenticate(req, res, next) {
  let token = null;

  // 1. Try HTTP-only cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Fall back to Authorization: Bearer <token>
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * requireAdmin — must be used after authenticate.
 * Returns 403 if the authenticated user is not an admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

module.exports = { authenticate, requireAdmin };
