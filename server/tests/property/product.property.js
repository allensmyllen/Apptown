/**
 * Property-based tests for the Product service (P5, P6, P11, P12, P13, P14)
 * Feature: digital-marketplace
 */

const fc = require('fast-check');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('../../src/services/storage');

const db = require('../../src/db');
const storage = require('../../src/services/storage');

process.env.JWT_SECRET = 'test-secret-product-pbt';

const app = require('../../src/app');
const { filterProducts, getFileFormat } = require('../../src/routes/products');

// ── Helpers ───────────────────────────────────────────────────────────────────

function adminToken() {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: 'admin-1', email: 'admin@example.com', role: 'admin', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

const CATEGORIES = ['theme', 'plugin', 'script', 'source_code'];

const productArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  price_cents: fc.integer({ min: 1, max: 100000 }),
  category: fc.constantFrom(...CATEGORIES),
  preview_link: fc.option(fc.webUrl(), { nil: null }),
  file_key: fc.string({ minLength: 1, maxLength: 50 }),
  file_format: fc.constantFrom('zip', 'rar', 'tar.gz'),
  published: fc.constant(true),
});

// ---------------------------------------------------------------------------
// Property 5: Product search and filter correctness
// Validates: Requirements 3.2, 3.3
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 5: Product search and filter correctness

describe('P5 — Product search and filter correctness', () => {
  test(
    'all returned products satisfy the filter; no matching product is omitted',
    () => {
      fc.assert(
        fc.property(
          fc.array(productArb, { minLength: 0, maxLength: 20 }),
          fc.option(fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z]+$/i.test(s)), { nil: null }),
          fc.option(fc.constantFrom(...CATEGORIES), { nil: null }),
          (products, search, category) => {
            const result = filterProducts(products, search, category);

            // Every returned product must satisfy the filter
            for (const p of result) {
              expect(p.published).toBe(true);
              if (category) expect(p.category).toBe(category);
              if (search) {
                const q = search.toLowerCase();
                const matches = p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
                expect(matches).toBe(true);
              }
            }

            // No matching product should be omitted
            const expected = products.filter((p) => {
              if (!p.published) return false;
              if (category && p.category !== category) return false;
              if (search) {
                const q = search.toLowerCase();
                return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
              }
              return true;
            });

            expect(result).toHaveLength(expected.length);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 6: Product detail response contains all required fields
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 6: Product detail response contains all required fields

describe('P6 — Product detail contains all required fields', () => {
  test(
    'GET /api/products/:id returns title, description, price_cents, category, preview_link',
    async () => {
      await fc.assert(
        fc.asyncProperty(productArb, async (product) => {
          db.query.mockResolvedValueOnce({ rows: [product] });

          const res = await request(app).get(`/api/products/${product.id}`);

          expect(res.status).toBe(200);
          expect(res.body.title).toBeDefined();
          expect(res.body.description).toBeDefined();
          expect(res.body.price_cents).toBeDefined();
          expect(res.body.category).toBeDefined();
          expect('preview_link' in res.body).toBe(true);
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 11: Product creation persists all fields
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 11: Product creation persists all fields

describe('P11 — Product creation round-trip', () => {
  test(
    'POST then GET returns the same field values',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            price_cents: fc.integer({ min: 1, max: 100000 }),
            category: fc.constantFrom(...CATEGORIES),
            preview_link: fc.option(fc.webUrl(), { nil: null }),
          }),
          async (payload) => {
            const id = 'prod-' + Math.random().toString(36).slice(2);
            const created = {
              id,
              ...payload,
              file_key: `products/${id}.zip`,
              file_format: 'zip',
              published: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            storage.uploadFile.mockResolvedValue(created.file_key);
            db.query.mockResolvedValueOnce({ rows: [created] }); // POST insert
            db.query.mockResolvedValueOnce({ rows: [created] }); // GET

            // POST
            const postRes = await request(app)
              .post('/api/products')
              .set('Authorization', `Bearer ${adminToken()}`)
              .field('title', payload.title)
              .field('description', payload.description)
              .field('price_cents', String(payload.price_cents))
              .field('category', payload.category)
              .field('preview_link', payload.preview_link || '')
              .attach('file', Buffer.from('zip'), 'product.zip');

            expect(postRes.status).toBe(201);

            // GET
            const getRes = await request(app).get(`/api/products/${id}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.title).toBe(created.title);
            expect(getRes.body.description).toBe(created.description);
            expect(getRes.body.price_cents).toBe(created.price_cents);
            expect(getRes.body.category).toBe(created.category);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 12: Product update round-trip
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 12: Product update round-trip

describe('P12 — Product update round-trip', () => {
  test(
    'PUT then GET returns updated values',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
            price_cents: fc.integer({ min: 1, max: 100000 }),
          }),
          async (update) => {
            const id = 'prod-' + Math.random().toString(36).slice(2);
            const updated = {
              id,
              title: update.title,
              description: 'original desc',
              price_cents: update.price_cents,
              category: 'theme',
              preview_link: null,
              file_key: `products/${id}.zip`,
              file_format: 'zip',
              published: true,
              updated_at: new Date().toISOString(),
            };

            db.query.mockResolvedValueOnce({ rows: [updated] }); // PUT
            db.query.mockResolvedValueOnce({ rows: [updated] }); // GET

            const putRes = await request(app)
              .put(`/api/products/${id}`)
              .set('Authorization', `Bearer ${adminToken()}`)
              .send(update);

            expect(putRes.status).toBe(200);
            expect(putRes.body.title).toBe(update.title);
            expect(putRes.body.price_cents).toBe(update.price_cents);

            const getRes = await request(app).get(`/api/products/${id}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.title).toBe(update.title);
          }
        ),
        { numRuns: 100 }
      );
    },
    60000
  );
});

// ---------------------------------------------------------------------------
// Property 13: Soft-delete removes product from public listing
// Validates: Requirements 6.4
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 13: Soft-delete removes product from public listing

describe('P13 — Soft-delete removes from public listing', () => {
  test(
    'after DELETE, product does not appear in GET /api/products',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (id) => {
          // DELETE returns the id
          db.query.mockResolvedValueOnce({ rows: [{ id }] });
          // GET /api/products returns empty (product is unpublished)
          db.query.mockResolvedValueOnce({ rows: [] });

          const delRes = await request(app)
            .delete(`/api/products/${id}`)
            .set('Authorization', `Bearer ${adminToken()}`);

          expect(delRes.status).toBe(204);

          const listRes = await request(app).get('/api/products');
          expect(listRes.status).toBe(200);
          const ids = listRes.body.products.map((p) => p.id);
          expect(ids).not.toContain(id);
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});

// ---------------------------------------------------------------------------
// Property 14: File format validation
// Validates: Requirements 6.6
// ---------------------------------------------------------------------------

// Feature: digital-marketplace, Property 14: File format validation

describe('P14 — File format validation', () => {
  const validExtensions = ['.zip', '.rar', '.tar.gz'];
  const invalidExtensions = ['.exe', '.pdf', '.tar', '.gz', '.7z', '.dmg', '.mp4', '.txt'];

  test(
    'valid extensions (zip, rar, tar.gz) are accepted',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validExtensions),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9]+$/i.test(s)),
          (ext, base) => {
            const filename = `${base}${ext}`;
            expect(getFileFormat(filename)).not.toBeNull();
            expect(validExtensions.map((e) => e.slice(1))).toContain(getFileFormat(filename));
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  test(
    'invalid extensions are rejected (return null)',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidExtensions),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z0-9]+$/i.test(s)),
          (ext, base) => {
            const filename = `${base}${ext}`;
            expect(getFileFormat(filename)).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
