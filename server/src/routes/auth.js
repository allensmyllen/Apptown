const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db');
const { sendOtp, sendWelcome } = require('../services/email');

const router = express.Router();

const BCRYPT_COST = 10;
const JWT_EXPIRY_SECONDS = 86400; // 24 hours
const OTP_EXPIRY_MINUTES = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp() {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

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

async function createAndSendOtp(userId, email, purpose) {
  // Invalidate any existing unused OTPs for this user+purpose
  await db.query(
    `UPDATE otp_verifications SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_COST);

  await db.query(
    `INSERT INTO otp_verifications (user_id, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '${OTP_EXPIRY_MINUTES} minutes')`,
    [userId, otpHash, purpose]
  );

  await sendOtp(email, otp, purpose);
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find(i => i.path.includes('password'));
      if (passwordIssue) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, display_name, password } = parsed.data;

    // Check for existing account — handle missing email_verified column gracefully
    let existing;
    try {
      existing = await db.query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    } catch (colErr) {
      if (colErr.code === '42703') {
        // email_verified column doesn't exist yet — treat all existing accounts as verified
        existing = await db.query('SELECT id, true as email_verified FROM users WHERE email = $1', [email]);
      } else {
        throw colErr;
      }
    }
    if (existing.rows.length > 0 && existing.rows[0].email_verified) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    let userId;

    if (existing.rows.length > 0) {
      const password_hash = await bcrypt.hash(password, BCRYPT_COST);
      await db.query(
        'UPDATE users SET display_name = $1, password_hash = $2 WHERE id = $3',
        [display_name, password_hash, existing.rows[0].id]
      );
      userId = existing.rows[0].id;
    } else {
      const password_hash = await bcrypt.hash(password, BCRYPT_COST);
      // email_verified column added in migration 010 — default false if column exists, else omit
      let result;
      try {
        result = await db.query(
          `INSERT INTO users (email, display_name, password_hash, email_verified)
           VALUES ($1, $2, $3, false)
           RETURNING id`,
          [email, display_name, password_hash]
        );
      } catch (colErr) {
        // Fallback if email_verified column doesn't exist yet
        if (colErr.code === '42703') {
          result = await db.query(
            `INSERT INTO users (email, display_name, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [email, display_name, password_hash]
          );
        } else {
          throw colErr;
        }
      }
      userId = result.rows[0].id;
    }

    // Try to send OTP — if otp_verifications table doesn't exist, fall back to direct login
    try {
      await createAndSendOtp(userId, email, 'register');
      return res.status(200).json({ pending_user_id: userId });
    } catch (otpErr) {
      // Table doesn't exist (migration 009 not run) — mark verified and issue token directly
      if (otpErr.code === '42P01') {
        const result = await db.query(
          'UPDATE users SET email_verified = true WHERE id = $1 RETURNING id, email, role',
          [userId]
        );
        const user = result.rows[0];
        const token = signToken(user);
        setAuthCookie(res, token);
        return res.status(201).json({ token, warning: 'OTP table not set up — run migrations' });
      }
      throw otpErr;
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
const verifyOtpSchema = z.object({
  user_id: z.string().uuid(),
  otp: z.string().length(6),
  purpose: z.enum(['register', 'reset_password']),
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });

    const { user_id, otp, purpose } = parsed.data;

    const rows = await db.query(
      `SELECT id, otp_hash FROM otp_verifications
       WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user_id, purpose]
    );

    if (rows.rows.length === 0) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new one.' });
    }

    const row = rows.rows[0];
    const match = await bcrypt.compare(otp, row.otp_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    }

    // Mark OTP used
    await db.query('UPDATE otp_verifications SET used_at = NOW() WHERE id = $1', [row.id]);

    if (purpose === 'register') {
      // Mark user verified and issue JWT
      const result = await db.query(
        `UPDATE users SET email_verified = true WHERE id = $1
         RETURNING id, email, role, display_name`,
        [user_id]
      );
      const user = result.rows[0];
      // Capture IP
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
      if (ip) await db.query('UPDATE users SET last_ip = $1 WHERE id = $2', [ip, user_id]);
      // Send welcome email (fire-and-forget)
      sendWelcome(user.email, user.display_name || user.email.split('@')[0]).catch(() => {});
      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(200).json({ token });
    }

    if (purpose === 'reset_password') {
      // Issue a short-lived reset token (not a JWT — just a signed random token stored in DB)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST);
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
        [user_id, tokenHash]
      );
      return res.status(200).json({ reset_token: rawToken });
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
// Simple in-memory rate limit: max 3 resends per user_id per 10 minutes
const resendAttempts = new Map();
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { user_id, purpose } = req.body;
    if (!user_id || !purpose) return res.status(400).json({ error: 'Invalid request' });

    // Rate limit check
    const key = user_id + ':' + purpose;
    const now = Date.now();
    const window = 10 * 60 * 1000; // 10 minutes
    const attempts = (resendAttempts.get(key) || []).filter(t => now - t < window);
    if (attempts.length >= 3) {
      return res.status(429).json({ error: 'Too many requests. Please wait before requesting another code.' });
    }
    attempts.push(now);
    resendAttempts.set(key, attempts);

    const result = await db.query('SELECT id, email FROM users WHERE id = $1', [user_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = result.rows[0];
    await createAndSendOtp(user.id, user.email, purpose);

    return res.status(200).json({ message: 'OTP resent' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// In-memory brute-force protection: max 10 attempts per IP per 15 minutes
const loginAttempts = new Map();

router.post('/login', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const window = 15 * 60 * 1000;
    const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < window);
    if (attempts.length >= 10) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(401).json({ error: 'Invalid email or password' });

    const { email, password } = parsed.data;
    let result;
    try {
      result = await db.query(
        'SELECT id, email, role, password_hash, email_verified FROM users WHERE email = $1',
        [email]
      );
    } catch (colErr) {
      if (colErr.code === '42703') {
        result = await db.query(
          'SELECT id, email, role, password_hash, true as email_verified FROM users WHERE email = $1',
          [email]
        );
      } else {
        throw colErr;
      }
    }

    if (result.rows.length === 0) {
      attempts.push(now); loginAttempts.set(ip, attempts);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      attempts.push(now); loginAttempts.set(ip, attempts);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.email_verified) {
      await createAndSendOtp(user.id, user.email, 'register');
      return res.status(403).json({ error: 'Email not verified', pending_user_id: user.id });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned. Contact support.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been temporarily blocked. Contact support.' });
    }

    // Clear failed attempts on success
    loginAttempts.delete(ip);

    const captureIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    if (captureIp) await db.query('UPDATE users SET last_ip = $1 WHERE id = $2', [captureIp, user.id]);

    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  return res.status(200).json({ message: 'Logged out' });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  let token = null;
  if (req.cookies?.token) token = req.cookies.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: payload });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(200).json({ message: 'If that email is registered, an OTP has been sent.' });

    const result = await db.query(
      'SELECT id, email FROM users WHERE email = $1 AND email_verified = true',
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      await createAndSendOtp(user.id, user.email, 'reset_password');
      // Return user_id so the frontend can pass it to verify-otp
      return res.status(200).json({ pending_user_id: user.id });
    }

    // Always 200 to prevent email enumeration
    return res.status(200).json({ message: 'If that email is registered, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid request' });
    }

    const { token: rawToken, password } = parsed.data;

    const tokenResult = await db.query(
      `SELECT id, user_id, token_hash FROM password_reset_tokens
       WHERE used_at IS NULL AND expires_at > NOW()`
    );

    let matchedRow = null;
    for (const row of tokenResult.rows) {
      const match = await bcrypt.compare(rawToken, row.token_hash);
      if (match) { matchedRow = row; break; }
    }

    if (!matchedRow) {
      return res.status(400).json({ error: 'This reset token is invalid or has expired.' });
    }

    const newHash = await bcrypt.hash(password, BCRYPT_COST);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, matchedRow.user_id]);
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [matchedRow.id]);

    return res.status(200).json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/profile ─────────────────────────────────────────────────────
router.get('/profile', async (req, res, next) => {
  // Inline auth check (no middleware to keep it simple)
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.slice(7);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  try {
    const result = await db.query(
      'SELECT id, email, display_name, role, created_at FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ profile: result.rows[0] });
  } catch (err) { next(err); }
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100),
});

router.put('/profile', async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.slice(7);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    await db.query('UPDATE users SET display_name = $1 WHERE id = $2', [parsed.data.display_name, payload.sub]);
    return res.json({ message: 'Profile updated.' });
  } catch (err) { next(err); }
});

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

router.put('/change-password', async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.slice(7);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { current_password, new_password } = parsed.data;
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, BCRYPT_COST);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, payload.sub]);
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;
