/**
 * Property-based tests for the Auth service (P1–P4)
 * Feature: digital-marketplace
 */

const fc = require('fast-check');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the db module
jest.mock('../../src/db');
const db = require('../../src/db');

process.env.JWT_SECRET = 'test-secret-pbt';

const app = require('../../src/app');

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Valid email: simple local@domain.tld that Zod's email() accepts
// Zod uses a strict email regex — avoid special chars in local part
const validEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
    fc.constantFrom('com', 'net', 'org', 'io', 'dev')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Invalid email: strings that are definitely not emails
const invalidEmail = fc.oneof(
  fc.constant(''),
  fc.constant('notanemail'),
  fc.constant('@nodomain'),
  fc.constant('no-at-sign'),
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('@'))
);

// Valid password: >= 8 printable ASCII chars (no leading/trailing whitespace issues)
const validPassword = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.trim().length >= 8);

// Invalid password: < 8 chars
const invalidPassword = fc.string({ minLength: 0, maxLength: 7 });

// Valid display name
const validDisplayName = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length >= 1);

// ---------------------------------------------------------------------------
// Property 1: Registration input validation
// Validates: Requirements 1.1, 1.4
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 1: Registration input validation

describe('P1 — Registration input validation', () => {
  test(
    'valid email + valid password => 201 (not 400/422)',
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, validDisplayName, async (email, password, displayName) => {
          // Mock: no duplicate email, successful insert returns the same email
          db.query
            .mockResolvedValueOnce({ rows: [] }) // duplicate check
            .mockResolvedValueOnce({
              rows: [{ id: 'uuid-1', email, role: 'user' }],
            });

          const res = await request(app)
            .post('/api/auth/register')
            .send({ email, display_name: displayName, password });

          // Should not be a validation error (400)
          expect(res.status).not.toBe(400);
          expect(res.status).not.toBe(422);
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'invalid password (< 8 chars) => 400',
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, invalidPassword, validDisplayName, async (email, password, displayName) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send({ email, display_name: displayName, password });

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('Password must be at least 8 characters');
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'invalid email format => 400',
    async () => {
      await fc.assert(
        fc.asyncProperty(invalidEmail, validPassword, validDisplayName, async (email, password, displayName) => {
          const res = await request(app)
            .post('/api/auth/register')
            .send({ email, display_name: displayName, password });

          // Invalid email should be rejected (400)
          expect(res.status).toBe(400);
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 2: Registration returns a valid JWT
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 2: Registration returns a valid JWT

describe('P2 — Registration returns a valid JWT', () => {
  test(
    'valid registration payload returns a structurally valid signed JWT',
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, validDisplayName, async (email, password, displayName) => {
          db.query
            .mockResolvedValueOnce({ rows: [] }) // no duplicate
            .mockResolvedValueOnce({
              rows: [{ id: 'some-uuid', email, role: 'user' }],
            });

          const res = await request(app)
            .post('/api/auth/register')
            .send({ email, display_name: displayName, password });

          expect(res.status).toBe(201);
          expect(res.body.token).toBeDefined();

          // Must be a valid JWT: three base64url segments separated by dots
          const parts = res.body.token.split('.');
          expect(parts).toHaveLength(3);

          // Must be verifiable with the known secret
          const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
          expect(decoded.email).toBe(email);
          expect(decoded.sub).toBeDefined();
          expect(decoded.role).toBeDefined();
          expect(decoded.iat).toBeDefined();
          expect(decoded.exp).toBeDefined();
        }),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 3: Login JWT has 24-hour expiry
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 3: Login JWT has 24-hour expiry

describe('P3 — Login JWT has 24-hour expiry', () => {
  test(
    'login with valid credentials returns JWT where exp - iat === 86400',
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, async (email, password) => {
          const hash = await bcrypt.hash(password, 10);
          const user = { id: 'uuid-login', email, role: 'user', password_hash: hash };

          db.query.mockResolvedValueOnce({ rows: [user] });

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          expect(res.status).toBe(200);
          expect(res.body.token).toBeDefined();

          const decoded = jwt.decode(res.body.token);
          expect(decoded.exp - decoded.iat).toBe(86400);
        }),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 4: Invalid login credentials return 401
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 4: Invalid login credentials return 401

describe('P4 — Invalid login credentials return 401', () => {
  test(
    'unregistered email returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(validEmail, validPassword, async (email, password) => {
          // Simulate no user found in DB
          db.query.mockResolvedValueOnce({ rows: [] });

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          expect(res.status).toBe(401);
          expect(res.body.error).toBe('Invalid email or password');
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'wrong password returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmail,
          validPassword,
          validPassword,
          async (email, correctPassword, wrongPassword) => {
            // Ensure the passwords are different
            fc.pre(correctPassword !== wrongPassword);

            const hash = await bcrypt.hash(correctPassword, 10);
            const user = { id: 'uuid-wp', email, role: 'user', password_hash: hash };

            db.query.mockResolvedValueOnce({ rows: [user] });

            const res = await request(app)
              .post('/api/auth/login')
              .send({ email, password: wrongPassword });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});
