/**
 * Property-based tests for Role-Based Access Control (P18)
 * Feature: digital-marketplace
 */

// Feature: digital-marketplace, Property 18: Role-based access control

const fc = require('fast-check');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const { authenticate, requireAdmin } = require('../../src/middleware/auth');

process.env.JWT_SECRET = 'test-secret-rbac';

// ---------------------------------------------------------------------------
// Build a minimal test app with a protected user route and an admin route
// ---------------------------------------------------------------------------

function buildTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());

  // Protected user endpoint (requires valid JWT)
  app.get('/api/protected', authenticate, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  // Admin-only endpoint (requires valid JWT + admin role)
  app.get('/api/admin/resource', authenticate, requireAdmin, (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

const testApp = buildTestApp();

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Non-admin roles
const nonAdminRole = fc.constantFrom('user', 'buyer', 'moderator', 'guest');

// Valid user payload (non-admin)
const nonAdminPayload = fc.record({
  sub: fc.uuid(),
  email: fc.emailAddress(),
  role: nonAdminRole,
});

function makeToken(payload, secret = process.env.JWT_SECRET) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 86400;
  return jwt.sign({ ...payload, iat, exp }, secret, { algorithm: 'HS256' });
}

// ---------------------------------------------------------------------------
// Property 18: Role-based access control
// Validates: Requirements 8.1, 8.2, 8.3, 8.4
// ---------------------------------------------------------------------------

describe('P18 — RBAC enforcement', () => {
  test(
    'non-admin authenticated user hitting admin endpoint returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(nonAdminPayload, async (payload) => {
          const token = makeToken(payload);

          const res = await request(testApp)
            .get('/api/admin/resource')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Forbidden');
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'unauthenticated request to protected user endpoint returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random paths/payloads but always send no token
          fc.constant(null),
          async () => {
            const res = await request(testApp).get('/api/protected');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Unauthorized');
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'unauthenticated request to admin endpoint returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const res = await request(testApp).get('/api/admin/resource');
          expect(res.status).toBe(401);
          expect(res.body.error).toBe('Unauthorized');
        }),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'admin user hitting admin endpoint returns 200',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({ sub: fc.uuid(), email: fc.emailAddress() }),
          async (base) => {
            const token = makeToken({ ...base, role: 'admin' });

            const res = await request(testApp)
              .get('/api/admin/resource')
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );

  test(
    'request with invalid/tampered JWT to protected endpoint returns 401',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }).filter((s) => !s.includes(' ')),
          async (garbage) => {
            const res = await request(testApp)
              .get('/api/protected')
              .set('Authorization', `Bearer ${garbage}`);

            expect(res.status).toBe(401);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});
