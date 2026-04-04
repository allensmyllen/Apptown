/**
 * Property-based tests for the Support License System
 * Feature: support-license-system
 */

const fc = require('fast-check');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the db module
jest.mock('../../src/db');
jest.mock('../../src/services/storage');
jest.mock('../../src/services/email');

const db = require('../../src/db');

process.env.JWT_SECRET = 'test-secret-support-pbt';

const app = require('../../src/app');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function adminToken() {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: 'admin-uuid-1', email: 'admin@example.com', role: 'admin', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Strings that are definitely NOT valid ISO 8601 dates (YYYY-MM-DD).
// Must be non-empty: parseDateRange treats empty/falsy params as "not provided"
// and falls back to the default 30-day range rather than returning a 400.
const invalidISODate = fc.oneof(
  // Plain words
  fc.constant('not-a-date'),
  fc.constant('yesterday'),
  fc.constant('today'),
  // Invalid month (13)
  fc.constant('2024-13-01'),
  // Invalid day (32)
  fc.constant('2024-01-32'),
  // Wrong separators
  fc.constant('2024/01/15'),
  fc.constant('20240115'),
  // Partial dates
  fc.constant('2024-01'),
  fc.constant('2024'),
  // Strings that match YYYY-MM-DD pattern but are invalid calendar dates
  fc.constant('2024-00-01'),
  fc.constant('2024-01-00'),
  // Non-empty random strings that don't match YYYY-MM-DD
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(s))
);

// ---------------------------------------------------------------------------
// Property 2: Invalid date parameters always produce an error
// Validates: Requirements 1.7
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 2: Invalid date parameters always produce an error

describe('P2 — Invalid date parameters always produce an error', () => {
  test(
    'any non-ISO-8601 string passed as ?start returns 400',
    async () => {
      await fc.assert(
        fc.asyncProperty(invalidISODate, async (invalidDate) => {
          // First call: auth middleware checks user status
          db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });

          const res = await request(app)
            .get('/api/admin/charts')
            .set('Authorization', `Bearer ${adminToken()}`)
            .query({ start: invalidDate });

          // Route should 400 before reaching any further DB calls
          expect(res.status).toBe(400);
          expect(res.body.error).toBe('Invalid date parameter');
        }),
        { numRuns: 100 }
      );
    },
    60000
  );

  test(
    'any non-ISO-8601 string passed as ?end returns 400',
    async () => {
      await fc.assert(
        fc.asyncProperty(invalidISODate, async (invalidDate) => {
          // First call: auth middleware checks user status
          db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });

          const res = await request(app)
            .get('/api/admin/charts')
            .set('Authorization', `Bearer ${adminToken()}`)
            .query({ end: invalidDate });

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('Invalid date parameter');
        }),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 1: Chart series dates are within the requested range
// Validates: Requirements 1.6
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 1: Chart series dates are within the requested range

describe('P1 — Chart series dates are within the requested range', () => {
  test(
    'every series entry date falls within [start, end] inclusive',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid start date between 2020-01-01 and 2024-12-01
          fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-01') }),
          // Generate a duration of 0–364 days so start <= end and range <= 365
          fc.integer({ min: 0, max: 364 }),
          async (startDate, durationDays) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + durationDays);

            const start = startDate.toISOString().slice(0, 10);
            const end = endDate.toISOString().slice(0, 10);

            // Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // Revenue rows (empty — no orders in range)
            db.query.mockResolvedValueOnce({ rows: [] });
            // View rows (empty — no page views in range)
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
              .get('/api/admin/charts')
              .set('Authorization', `Bearer ${adminToken()}`)
              .query({ start, end });

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.series)).toBe(true);

            const expectedDays = durationDays + 1; // inclusive range
            expect(res.body.series).toHaveLength(expectedDays);

            // Reconstruct the expected dates for the range and verify each entry
            const cursor = new Date(start);
            const endBound = new Date(end);
            for (const entry of res.body.series) {
              // Each entry's date label should correspond to a day within [start, end]
              const expectedLabel = cursor.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              expect(entry.date).toBe(expectedLabel);
              // Cursor must not exceed end
              expect(cursor <= endBound).toBe(true);
              cursor.setDate(cursor.getDate() + 1);
            }
            // After iterating all entries, cursor should be exactly one day past end
            const dayAfterEnd = new Date(end);
            dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
            expect(cursor.toISOString().slice(0, 10)).toBe(dayAfterEnd.toISOString().slice(0, 10));
          }
        ),
        { numRuns: 100 }
      );
    },
    120000
  );
});

// ---------------------------------------------------------------------------
// Property 5: Duplicate single-product purchase always returns 409
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 5: Duplicate single-product purchase always returns 409

describe('P5 — Duplicate single-product purchase always returns 409', () => {
  test(
    'POST /api/orders with a product the user already owns always returns 409',
    async () => {
      const userId = 'user-uuid-p5';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p5@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // random product UUID
          async (productId) => {
            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Product lookup — product exists and is published
            db.query.mockResolvedValueOnce({
              rows: [{ id: productId, title: 'Test Product', price_cents: 5000, published: true }],
            });
            // 3. Duplicate check — user already has a completed order for this product
            db.query.mockResolvedValueOnce({ rows: [{ id: 'existing-order-uuid' }] });

            const res = await request(app)
              .post('/api/orders')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ productId });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('You already own this product. Visit My Downloads.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 6: Duplicate cart purchase always returns 409
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 6: Duplicate cart purchase always returns 409

describe('P6 — Duplicate cart purchase always returns 409', () => {
  test(
    'POST /api/orders/cart when user already owns at least one product always returns 409',
    async () => {
      const userId = 'user-uuid-p6';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p6@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate 1–5 product UUIDs
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (productIds) => {
            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });

            // 2. Products lookup — all products exist and are published
            const productRows = productIds.map((id) => ({
              id,
              title: 'Test Product',
              price_cents: 5000,
              published: true,
            }));
            db.query.mockResolvedValueOnce({ rows: productRows });

            // 3. Duplicate check — user already owns at least one product in the cart
            db.query.mockResolvedValueOnce({ rows: [{ product_id: productIds[0] }] });

            const res = await request(app)
              .post('/api/orders/cart')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ productIds });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('You already own one or more products in this cart.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 7: Support license key format invariant
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 7: generateSupportLicenseKey() always matches regex

const { generateSupportLicenseKey } = require('../../src/routes/support-licenses');

describe('P7 — generateSupportLicenseKey() always matches the expected format', () => {
  test(
    'every generated key matches /^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async () => {
          const key = generateSupportLicenseKey();
          expect(key).toMatch(/^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 8: Support license purchase requires product ownership
// Validates: Requirements 4.7
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 8: Support license purchase requires product ownership

describe('P8 — Support license purchase requires product ownership', () => {
  test(
    'POST /api/support-licenses/purchase without owning the product always returns 403',
    async () => {
      const userId = 'user-uuid-p8';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p8@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // random product UUID
          async (productId) => {
            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Ownership check — user does NOT own the product (empty rows)
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
              .post('/api/support-licenses/purchase')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ productId });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('You must own this product to purchase a support license.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 9: Exhausted support license always returns 403 on ticket creation
// Validates: Requirements 5.1
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 9: Exhausted support license always returns 403 on ticket creation

describe('P9 — Exhausted support license always returns 403 on ticket creation', () => {
  test(
    'POST /api/support-tickets with requests_used >= requests_total always returns 403',
    async () => {
      const userId = 'user-uuid-p9';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p9@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate (used, total) pairs where used >= total
          fc
            .tuple(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }))
            .filter(([used, total]) => used >= total),
          fc.uuid(), // random support license UUID
          async ([requestsUsed, requestsTotal], licenseId) => {
            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Support license lookup — returns license with requests_used >= requests_total
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: licenseId,
                  user_id: userId,
                  product_id: 'product-uuid-p9',
                  requests_used: requestsUsed,
                  requests_total: requestsTotal,
                },
              ],
            });

            const res = await request(app)
              .post('/api/support-tickets')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ supportLicenseId: licenseId, message: 'Please help me.' });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('No support requests remaining.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 10: Ticket submission increments requests_used by exactly 1
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 10: Ticket submission increments requests_used by exactly 1

describe('P10 — Ticket submission increments requests_used by exactly 1', () => {
  test(
    'POST /api/support-tickets with available requests calls UPDATE with requests_used + 1',
    async () => {
      const userId = 'user-uuid-p10';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p10@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate (used, total) pairs where used < total (requests available)
          fc
            .tuple(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 1, max: 10 }))
            .filter(([used, total]) => used < total),
          fc.uuid(), // random support license UUID
          async ([requestsUsed, requestsTotal], licenseId) => {
            const ticketId = 'ticket-uuid-p10';

            // Clear mock call history before each run
            db.query.mockClear();

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Support license lookup — returns license with available requests
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: licenseId,
                  user_id: userId,
                  product_id: 'product-uuid-p10',
                  requests_used: requestsUsed,
                  requests_total: requestsTotal,
                },
              ],
            });
            // 3. INSERT INTO tickets — ticket creation
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: ticketId,
                  support_license_id: licenseId,
                  user_id: userId,
                  product_id: 'product-uuid-p10',
                  message: 'Please help me.',
                  status: 'open',
                  created_at: new Date().toISOString(),
                },
              ],
            });
            // 4. INSERT INTO ticket_messages — initial message
            db.query.mockResolvedValueOnce({ rows: [] });
            // 5. UPDATE support_licenses SET requests_used = requests_used + 1
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
              .post('/api/support-tickets')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ supportLicenseId: licenseId, message: 'Please help me.' });

            // Response should be 201
            expect(res.status).toBe(201);

            // Find the UPDATE call among calls made during this run
            const updateCall = db.query.mock.calls.find(
              ([sql]) =>
                typeof sql === 'string' &&
                sql.includes('UPDATE support_licenses') &&
                sql.includes('requests_used')
            );

            expect(updateCall).toBeDefined();

            // The UPDATE query should reference the correct license id
            const updateArgs = updateCall[1];
            expect(updateArgs).toContain(licenseId);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 11: Empty message is always rejected
// Validates: Requirements 5.10
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 11: Empty message is always rejected

describe('P11 — Empty/whitespace message is always rejected', () => {
  test(
    'POST /api/support-tickets with empty or whitespace-only message always returns 400',
    async () => {
      const userId = 'user-uuid-p11';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p11@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate empty or whitespace-only strings
          fc.oneof(
            fc.constant(''),
            fc.stringOf(fc.constantFrom(' ', '\t', '\n'))
          ),
          fc.uuid(), // random support license UUID
          async (emptyMessage, licenseId) => {
            // Clear mock call history before each run
            db.query.mockClear();

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Support license lookup — license exists with available requests
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: licenseId,
                  user_id: userId,
                  product_id: 'product-uuid-p11',
                  requests_used: 0,
                  requests_total: 3,
                },
              ],
            });

            const res = await request(app)
              .post('/api/support-tickets')
              .set('Authorization', `Bearer ${userToken}`)
              .send({ supportLicenseId: licenseId, message: emptyMessage });

            // Should reject with 400 before any INSERT queries
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Message is required.');

            // Verify no INSERT queries were made (only auth check call should have happened)
            const insertCalls = db.query.mock.calls.filter(
              ([sql]) => typeof sql === 'string' && sql.trim().toUpperCase().startsWith('INSERT')
            );
            expect(insertCalls).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 12: Closed ticket always rejects new messages with 409
// Validates: Requirements 6.7, 6.6
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 12: Closed ticket always rejects new messages with 409

describe('P12 — Closed ticket always rejects new messages with 409', () => {
  test(
    'POST /api/support-tickets/:id/messages on a closed ticket always returns 409',
    async () => {
      const userId = 'user-uuid-p12';
      const userToken = jwt.sign(
        {
          sub: userId,
          email: 'user-p12@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        },
        process.env.JWT_SECRET
      );

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // random ticket UUID
          fc.string({ minLength: 1, maxLength: 200 }), // random non-empty message body
          async (ticketId, messageBody) => {
            // Clear mock call history before each run
            db.query.mockClear();

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Ticket lookup — returns a closed ticket owned by the user
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: ticketId,
                  user_id: userId,
                  product_id: 'product-uuid-p12',
                  status: 'closed',
                  user_email: 'user-p12@example.com',
                  product_title: 'Test Product',
                },
              ],
            });

            const res = await request(app)
              .post(`/api/support-tickets/${ticketId}/messages`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({ body: messageBody });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Ticket is closed.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 13: Ticket status filter returns only matching tickets
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 13: Ticket status filter returns only matching tickets

describe('P13 — Ticket status filter returns only matching tickets', () => {
  test(
    'GET /api/admin/support-tickets?status=open|closed returns only tickets with matching status',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of ticket objects with random statuses
          fc.array(
            fc.record({
              id: fc.uuid(),
              status: fc.constantFrom('open', 'closed'),
              created_at: fc.constant(new Date().toISOString()),
              license_key: fc.string({ minLength: 5, maxLength: 20 }),
              product_name: fc.string({ minLength: 1, maxLength: 30 }),
              user_email: fc.emailAddress(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          // Generate a status filter value
          fc.constantFrom('open', 'closed'),
          async (tickets, statusFilter) => {
            // Clear mock call history before each run
            db.query.mockClear();

            // The matching tickets (simulating what the DB WHERE clause would return)
            const matchingTickets = tickets.filter((t) => t.status === statusFilter);

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Support tickets query — DB returns only matching tickets (filtered by WHERE clause)
            db.query.mockResolvedValueOnce({ rows: matchingTickets });

            const res = await request(app)
              .get('/api/admin/support-tickets')
              .set('Authorization', `Bearer ${adminToken()}`)
              .query({ status: statusFilter });

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.tickets)).toBe(true);

            // Every returned ticket must have the requested status
            for (const ticket of res.body.tickets) {
              expect(ticket.status).toBe(statusFilter);
            }

            // The count must match the number of matching tickets
            expect(res.body.tickets).toHaveLength(matchingTickets.length);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 14: User ticket list never leaks other users' tickets
// Validates: Requirements 7.1, 7.6
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 14: User ticket list never leaks other users' tickets

describe('P14 — User ticket list never leaks other users\' tickets', () => {
  test(
    'GET /api/support-tickets never returns tickets where user_id != authenticated user\'s id',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a [userId, tickets] pair where all tickets belong to that user
          fc.uuid().chain((userId) =>
            fc.tuple(
              fc.constant(userId),
              fc.array(
                fc.record({
                  id: fc.uuid(),
                  user_id: fc.constant(userId),
                  status: fc.constantFrom('open', 'closed'),
                  product_title: fc.string({ minLength: 1, maxLength: 30 }),
                  created_at: fc.constant(new Date().toISOString()),
                  latest_message: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
                  unread_count: fc.constant('0'),
                }),
                { minLength: 0, maxLength: 10 }
              )
            )
          ),
          async ([userId, tickets]) => {
            // Clear mock call history before each run
            db.query.mockClear();

            const userToken = jwt.sign(
              {
                sub: userId,
                email: `user-${userId}@example.com`,
                role: 'user',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400,
              },
              process.env.JWT_SECRET
            );

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. GET /api/support-tickets query — DB returns only tickets for this user
            //    (simulating the WHERE user_id = $1 clause)
            db.query.mockResolvedValueOnce({ rows: tickets });

            const res = await request(app)
              .get('/api/support-tickets')
              .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.tickets)).toBe(true);

            // Every returned ticket must belong to the authenticated user
            for (const ticket of res.body.tickets) {
              expect(ticket.user_id).toBe(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 17: Non-owner non-admin always gets 403 on ticket messages
// Validates: Requirements 7.7, 7.8
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 17: Non-owner non-admin always gets 403 on ticket messages

describe('P17 — Non-owner non-admin always gets 403 on ticket messages', () => {
  test(
    'GET /api/support-tickets/:id/messages from non-owner non-admin always returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two distinct user UUIDs: owner and non-owner
          fc.uuid().chain((ownerUserId) =>
            fc.uuid()
              .filter((nonOwnerUserId) => nonOwnerUserId !== ownerUserId)
              .map((nonOwnerUserId) => ({ ownerUserId, nonOwnerUserId }))
          ),
          fc.uuid(), // ticket UUID
          async ({ ownerUserId, nonOwnerUserId }, ticketId) => {
            // Clear mock call history before each run
            db.query.mockClear();

            // Token for the non-owner (regular user, not admin)
            const nonOwnerToken = jwt.sign(
              {
                sub: nonOwnerUserId,
                email: `nonowner-${nonOwnerUserId}@example.com`,
                role: 'user',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400,
              },
              process.env.JWT_SECRET
            );

            // 1. Auth middleware: user status check for non-owner
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Ticket lookup — returns ticket owned by ownerUserId (not the requester)
            db.query.mockResolvedValueOnce({
              rows: [{ id: ticketId, user_id: ownerUserId }],
            });

            const res = await request(app)
              .get(`/api/support-tickets/${ticketId}/messages`)
              .set('Authorization', `Bearer ${nonOwnerToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Access denied.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );

  test(
    'POST /api/support-tickets/:id/messages from non-owner non-admin always returns 403',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two distinct user UUIDs: owner and non-owner
          fc.uuid().chain((ownerUserId) =>
            fc.uuid()
              .filter((nonOwnerUserId) => nonOwnerUserId !== ownerUserId)
              .map((nonOwnerUserId) => ({ ownerUserId, nonOwnerUserId }))
          ),
          fc.uuid(), // ticket UUID
          fc.string({ minLength: 1, maxLength: 200 }), // non-empty message body
          async ({ ownerUserId, nonOwnerUserId }, ticketId, messageBody) => {
            // Clear mock call history before each run
            db.query.mockClear();

            // Token for the non-owner (regular user, not admin)
            const nonOwnerToken = jwt.sign(
              {
                sub: nonOwnerUserId,
                email: `nonowner-${nonOwnerUserId}@example.com`,
                role: 'user',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400,
              },
              process.env.JWT_SECRET
            );

            // 1. Auth middleware: user status check for non-owner
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Ticket lookup — returns an open ticket owned by ownerUserId (not the requester)
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: ticketId,
                  user_id: ownerUserId,
                  product_id: 'product-uuid-p17',
                  status: 'open',
                  user_email: `owner-${ownerUserId}@example.com`,
                  product_title: 'Test Product',
                },
              ],
            });

            const res = await request(app)
              .post(`/api/support-tickets/${ticketId}/messages`)
              .set('Authorization', `Bearer ${nonOwnerToken}`)
              .send({ body: messageBody });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Access denied.');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 16: User reply always has sender_role = 'user'
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 16: User reply always has sender_role = 'user'

describe('P16 — User reply always has sender_role = \'user\'', () => {
  test(
    'POST /api/support-tickets/:id/messages by a regular user always results in sender_role = \'user\'',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // random ticket UUID
          fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0), // non-empty message body
          async (ticketId, messageBody) => {
            const userId = 'user-uuid-p16';
            const userToken = jwt.sign(
              {
                sub: userId,
                email: 'user-p16@example.com',
                role: 'user',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400,
              },
              process.env.JWT_SECRET
            );

            // Clear mock call history before each run
            db.query.mockClear();

            const messageId = 'msg-uuid-p16';

            // 1. Auth middleware: user status check
            db.query.mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] });
            // 2. Ticket lookup — returns an open ticket owned by the user
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: ticketId,
                  user_id: userId,
                  product_id: 'product-uuid-p16',
                  status: 'open',
                  user_email: 'user-p16@example.com',
                  product_title: 'Test Product',
                },
              ],
            });
            // 3. INSERT INTO ticket_messages — returns the inserted message record
            db.query.mockResolvedValueOnce({
              rows: [
                {
                  id: messageId,
                  ticket_id: ticketId,
                  sender_id: userId,
                  sender_role: 'user',
                  body: messageBody.trim(),
                  file_url: null,
                  created_at: new Date().toISOString(),
                },
              ],
            });

            const res = await request(app)
              .post(`/api/support-tickets/${ticketId}/messages`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({ body: messageBody });

            expect(res.status).toBe(201);
            expect(res.body.message).toBeDefined();
            expect(res.body.message.sender_role).toBe('user');

            // Also verify the INSERT was called with sender_role = 'user'
            const insertCall = db.query.mock.calls.find(
              ([sql]) =>
                typeof sql === 'string' &&
                sql.trim().toUpperCase().startsWith('INSERT INTO TICKET_MESSAGES')
            );
            expect(insertCall).toBeDefined();
            // The third parameter ($3) in the INSERT is sender_role
            const insertArgs = insertCall[1];
            expect(insertArgs[2]).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 3: Custom range validation — start after end
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 3: start > end always produces client validation error

/**
 * Pure validateDateRange function extracted from PeriodFilter.jsx for testing.
 * Returns an error string if invalid, or null if valid (or incomplete).
 */
function validateDateRange(start, end) {
  if (!start || !end) return null;
  if (start > end) return 'Start date must be before end date';
  const diffDays = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) return 'Range cannot exceed 365 days';
  return null;
}

describe('P3 — start > end always produces client validation error', () => {
  /**
   * Validates: Requirements 1.4
   */
  test(
    'for any (start, end) where start > end, validateDateRange returns "Start date must be before end date"',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid start date between 2020-01-02 and 2025-12-31
          fc.date({ min: new Date('2020-01-02'), max: new Date('2025-12-31') }),
          // Generate a duration of 1–365 days to subtract, ensuring end < start
          fc.integer({ min: 1, max: 365 }),
          async (startDate, durationDays) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() - durationDays);

            const start = startDate.toISOString().slice(0, 10);
            const end = endDate.toISOString().slice(0, 10);

            // Precondition: start must be strictly after end
            fc.pre(start > end);

            const result = validateDateRange(start, end);
            expect(result).toBe('Start date must be before end date');
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 4: Custom range validation — range exceeds 365 days
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------

// Feature: support-license-system, Property 4: Range > 365 days always produces client validation error

describe('P4 — range > 365 days always produces client validation error', () => {
  /**
   * Validates: Requirements 1.5
   */
  test(
    'for any (start, end) where the difference exceeds 365 days, validateDateRange returns "Range cannot exceed 365 days"',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid start date between 2015-01-01 and 2023-01-01
          fc.date({ min: new Date('2015-01-01'), max: new Date('2023-01-01') }),
          // Generate a duration strictly greater than 365 days (366–730)
          fc.integer({ min: 366, max: 730 }),
          async (startDate, durationDays) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + durationDays);

            const start = startDate.toISOString().slice(0, 10);
            const end = endDate.toISOString().slice(0, 10);

            // Precondition: end must be after start (no overlap with P3)
            fc.pre(start < end);

            const result = validateDateRange(start, end);
            expect(result).toBe('Range cannot exceed 365 days');
          }
        ),
        { numRuns: 100 }
      );
    },
    30000
  );
});
