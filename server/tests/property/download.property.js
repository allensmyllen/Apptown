/**
 * Property-based tests for Download service (P8, P9, P10)
 * Feature: digital-marketplace
 */

const fc = require('fast-check');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('../../src/services/storage');

const db = require('../../src/db');
const storage = require('../../src/services/storage');

process.env.JWT_SECRET = 'test-secret-download-pbt';

const app = require('../../src/app');
const { DOWNLOAD_TTL_SECONDS } = require('../../src/routes/downloads');

function userToken(id) {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: id, email: `${id}@example.com`, role: 'user', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

// ---------------------------------------------------------------------------
// Property 8: Download URL has 15-minute TTL
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 8: Download URL has 15-minute TTL

describe('P8 — Download URL TTL is 15 minutes', () => {
  test(
    'DOWNLOAD_TTL_SECONDS constant equals 900',
    () => {
      expect(DOWNLOAD_TTL_SECONDS).toBe(900);
    }
  );

  test(
    'getSignedDownloadUrl is called with TTL of 900 seconds for any completed order',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, productId) => {
          const fileKey = `products/${productId}.zip`;
          const fakeSignedUrl = `https://s3.example.com/${fileKey}?X-Amz-Expires=900`;

          db.query
            .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] }) // completed order check
            .mockResolvedValueOnce({ rows: [{ file_key: fileKey }] }); // product file_key

          storage.getSignedDownloadUrl.mockResolvedValue(fakeSignedUrl);

          await request(app)
            .get(`/api/downloads/${productId}`)
            .set('Authorization', `Bearer ${userToken(userId)}`);

          expect(storage.getSignedDownloadUrl).toHaveBeenCalledWith(fileKey, 900);
          storage.getSignedDownloadUrl.mockClear();
          db.query.mockClear();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 9: Unauthorized download returns 403
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 9: Unauthorized download returns 403

describe('P9 — Unauthorized download returns 403', () => {
  test(
    'user without completed order gets 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, productId) => {
          db.query.mockResolvedValueOnce({ rows: [] }); // no completed order

          const res = await request(app)
            .get(`/api/downloads/${productId}`)
            .set('Authorization', `Bearer ${userToken(userId)}`);

          expect(res.status).toBe(403);
          expect(res.body.error).toBe('Purchase required to download');
          db.query.mockClear();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 10: My Downloads lists all purchased products
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 10: My Downloads lists all purchased products

describe('P10 — My Downloads completeness', () => {
  test(
    'GET /api/orders returns exactly N orders for a user with N completed orders',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 20 }),
          async (userId, n) => {
            const orders = Array.from({ length: n }, (_, i) => ({
              id: `order-${i}`,
              product_id: `prod-${i}`,
              product_title: `Product ${i}`,
              status: 'completed',
              amount_cents: 999,
              created_at: new Date().toISOString(),
            }));

            db.query.mockResolvedValueOnce({ rows: orders });

            const res = await request(app)
              .get('/api/orders')
              .set('Authorization', `Bearer ${userToken(userId)}`);

            expect(res.status).toBe(200);
            expect(res.body.orders).toHaveLength(n);
            db.query.mockClear();
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});
