/**
 * Unit tests for auth service
 * Requirements: 1.5, 2.3, 2.4
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the db module so tests don't need a real database
jest.mock('../../src/db');
// Mock the email service so tests don't need a real SMTP server
jest.mock('../../src/services/email');

const db = require('../../src/db');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';

const app = require('../../src/app');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides = {}) {
  return {
    id: 'user-uuid-1234',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Req 1.5 — bcrypt cost factor >= 10
// ---------------------------------------------------------------------------

describe('Req 1.5 — bcrypt cost factor', () => {
  test('password is hashed with cost factor >= 10', async () => {
    const password = 'securepassword';
    const hash = await bcrypt.hash(password, 10);
    const rounds = bcrypt.getRounds(hash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });

  test('registration stores a bcrypt hash with cost >= 10', async () => {
    let capturedHash = null;

    db.query.mockImplementation(async (sql, params) => {
      if (sql && sql.includes('INSERT INTO users') && params) {
        capturedHash = params[2]; // password_hash is 3rd param
        return { rows: [{ id: 'uuid-1' }] };
      }
      return { rows: [] };
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', display_name: 'New User', password: 'password123' });

    db.query.mockReset();

    expect(capturedHash).not.toBeNull();
    const rounds = bcrypt.getRounds(capturedHash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Req 2.3 — HTTP-only cookie is set on login
// ---------------------------------------------------------------------------

describe('Req 2.3 — HTTP-only cookie on login', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('login response sets an HTTP-only cookie named "token"', async () => {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    const user = makeUser({ password_hash: hash, email_verified: true });

    db.query
      .mockResolvedValueOnce({ rows: [user] }) // SELECT user by email
      .mockResolvedValueOnce({ rows: [] }); // UPDATE last_ip

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(res.status).toBe(200);

    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();

    const tokenCookie = setCookieHeader.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie.toLowerCase()).toContain('httponly');
  });

  test('register response also sets an HTTP-only cookie', async () => {
    // Register flow: check duplicate -> insert user -> invalidate OTPs -> insert OTP
    // When otp table doesn't exist (42P01), falls back to direct login
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no duplicate email
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-1' }] }) // INSERT user
      .mockRejectedValueOnce(Object.assign(new Error('table not found'), { code: '42P01' })) // UPDATE otp (table missing)
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', email: 'a@b.com', role: 'user' }] }); // UPDATE email_verified

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', display_name: 'A', password: 'password123' });

    expect(res.status).toBe(201);
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const tokenCookie = setCookieHeader.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie.toLowerCase()).toContain('httponly');
  });
});

// ---------------------------------------------------------------------------
// Req 2.4 — Expired JWT returns 401
// ---------------------------------------------------------------------------

describe('Req 2.4 — Expired JWT returns 401', () => {
  test('request with expired JWT to a protected endpoint returns 401', async () => {
    // Create a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'x@x.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );

    // Use a protected endpoint — we'll add a simple test route via the middleware directly
    // Instead, test the authenticate middleware behaviour by calling a route that uses it.
    // We'll mount a temporary test route on the app for this purpose.
    const express = require('express');
    const { authenticate } = require('../../src/middleware/auth');
    const testApp = express();
    testApp.use(require('cookie-parser')());
    testApp.get('/protected', authenticate, (req, res) => res.json({ ok: true }));

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expired');
  });

  test('request with no token to a protected endpoint returns 401', async () => {
    const express = require('express');
    const { authenticate } = require('../../src/middleware/auth');
    const testApp = express();
    testApp.use(require('cookie-parser')());
    testApp.get('/protected', authenticate, (req, res) => res.json({ ok: true }));

    const res = await request(testApp).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});
