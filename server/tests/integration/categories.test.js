/**
 * Integration tests for category CRUD
 * Requirements: 8.3
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('../../src/services/storage');

const db = require('../../src/db');

process.env.JWT_SECRET = 'test-categories-integration';

const app = require('../../src/app');

function adminToken() {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: 'admin-1', email: 'admin@example.com', role: 'admin', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

describe('Category CRUD', () => {
  test('POST /api/categories creates a category and GET returns it', async () => {
    const category = { id: 'cat-1', name: 'UI Kits', slug: 'ui_kits', created_at: new Date().toISOString() };

    // POST: duplicate check returns empty, then insert
    db.query.mockResolvedValueOnce({ rows: [] }); // no duplicate
    db.query.mockResolvedValueOnce({ rows: [category] }); // insert

    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'UI Kits' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('UI Kits');
    expect(createRes.body.slug).toBe('ui_kits');

    // GET
    db.query.mockResolvedValueOnce({ rows: [category] });
    const listRes = await request(app).get('/api/categories');
    expect(listRes.status).toBe(200);
    expect(listRes.body.categories).toHaveLength(1);
    expect(listRes.body.categories[0].name).toBe('UI Kits');
  });

  test('POST /api/categories returns 409 for duplicate name', async () => {
    const existing = { id: 'cat-1', name: 'UI Kits', slug: 'ui_kits', created_at: new Date().toISOString() };

    // duplicate check returns existing row
    db.query.mockResolvedValueOnce({ rows: [existing] });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'UI Kits' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test('DELETE /api/categories/:id returns 409 when products use the category', async () => {
    const category = { id: 'cat-1', slug: 'ui_kits' };

    // find category
    db.query.mockResolvedValueOnce({ rows: [category] });
    // count products using slug — returns 3
    db.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const res = await request(app)
      .delete('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/3 product/i);
    expect(res.body.count).toBe(3);
  });

  test('DELETE /api/categories/:id soft-deletes when no products use it', async () => {
    const category = { id: 'cat-2', slug: 'empty_cat' };

    // find category
    db.query.mockResolvedValueOnce({ rows: [category] });
    // count products — returns 0
    db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    // soft-delete update
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/categories/cat-2')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(204);
  });

  test('PUT /api/categories/:id updates name and slug', async () => {
    const updated = { id: 'cat-1', name: 'UI Components', slug: 'ui_components', created_at: new Date().toISOString() };

    // duplicate check returns empty
    db.query.mockResolvedValueOnce({ rows: [] });
    // update
    db.query.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'UI Components' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('UI Components');
    expect(res.body.slug).toBe('ui_components');
  });

  test('GET /api/categories is public (no auth required)', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([]);
  });

  test('POST /api/categories returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test' });

    expect(res.status).toBe(401);
  });
});
