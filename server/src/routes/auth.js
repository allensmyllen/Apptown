const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');

const router = express.Router();

const BCRYPT_COST = 10;
const JWT_EXPIRY_SECONDS = 86400; // 24 hours

const registerSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_EXPIRY_SECONDS;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, iat, exp },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: JWT_EXPIRY_SECONDS * 1000,
  });
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find(
        (i) => i.path.includes('password')
      );
      if (passwordIssue) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, display_name, password } = parsed.data;

    // Check for duplicate email
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);

    const result = await db.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email, display_name, password_hash]
    );

    const user = result.rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { email, password } = parsed.data;

    const result = await db.query(
      'SELECT id, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  return res.status(200).json({ message: 'Logged out' });
});

module.exports = router;
