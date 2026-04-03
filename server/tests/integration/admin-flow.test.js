/**
 * Integration test — admin product CRUD with file upload + CSV export
 * Requirements: 6.1, 6.3, 6.4, 7.1, 7.4
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('../../src/services/storage');

const db = require('../../src/db');
const storage = require('../../src/services/storage');

process.env.JWT_SECRET = 'test-admin-integration';

const app = require('../../src/app');

function adminToken() {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: 'admin-1', email: 'admin@example.com', role: 'admin', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

describe('Admin product CRUD with file upload', () => {
  test('create → GET → update → GET → delete → absent from public listing', async () => {
    const productId = 'prod-admin-1';
    const product = {
      id: productId, title: 'Admin Product', description: 'Desc', price_cents: 2999,
      category: 'plugin', preview_link: null, file_key: `products/${productId}.zip`,
      file_format: 'zip', published: true,
    };
    const updated = { ...product, title: 'Updated Product', price_cents: 3999 };

    storage.uploadFile.mockResolvedValue(product.file_key);

    // Create
    db.query.mockResolvedValueOnce({ rows: [product] });
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .field('title', 'Admin Product').field('description', 'Desc')
      .field('price_cents', '2999').field('category', 'plugin')
      .attach('file', Buffer.from('zip'), 'product.zip');
    expect(createRes.status).toBe(201);

    // GET
    db.query.mockResolvedValueOnce({ rows: [product] });
    const getRes = await request(app).get(`/api/products/${productId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe('Admin Product');

    // Update
    db.query.mockResolvedValueOnce({ rows: [updated] });
    const updateRes = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: 'Updated Product', price_cents: 3999 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated Product');

    // GET updated
    db.query.mockResolvedValueOnce({ rows: [updated] });
    const getUpdated = await request(app).get(`/api/products/${productId}`);
    expect(getUpdated.body.price_cents).toBe(3999);

    // Delete (soft)
    db.query.mockResolvedValueOnce({ rows: [{ id: productId }] });
    const deleteRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(deleteRes.status).toBe(204);

    // Absent from public listing
    db.query.mockResolvedValueOnce({ rows: [] });
    const listRes = await request(app).get('/api/products');
    expect(listRes.body.products.map((p) => p.id)).not.toContain(productId);
  });
});

describe('Admin CSV export', () => {
  test('seed orders → export → parse CSV → assert rows', async () => {
    const orders = [
      { id: 'o1', buyer_email: 'a@a.com', product_title: 'Product A', amount_cents: 999, status: 'completed' },
      { id: 'o2', buyer_email: 'b@b.com', product_title: 'Product B', amount_cents: 1999, status: 'completed' },
    ];

    db.query.mockResolvedValueOnce({ rows: orders });

    const res = await request(app)
      .get('/api/admin/orders/export')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');

    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[0]).toBe('order_id,buyer_email,product_title,amount_cents,status');
    expect(lines[1]).toContain('o1');
    expect(lines[2]).toContain('o2');
  });
});
