/**
 * Integration tests for webhook → license creation flow and GET /api/licenses scoping
 * Requirements: 8.4, 8.5
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('stripe');
jest.mock('../../src/services/storage');
jest.mock('../../src/services/email');

const db = require('../../src/db');
const email = require('../../src/services/email');

process.env.JWT_SECRET = 'test-license-integration';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
process.env.CLIENT_URL = 'http://localhost:5173';

const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

const app = require('../../src/app');

function userToken(userId, userEmail = 'user@example.com') {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: userId, email: userEmail, role: 'user', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

// ---------------------------------------------------------------------------
// Task 8.4: Webhook → license creation flow
// ---------------------------------------------------------------------------

describe('Webhook → license creation flow', () => {
  test('checkout.session.completed creates a license row and sends email with licenseKey', async () => {
    const userId = 'user-lic-1';
    const productId = 'prod-lic-1';
    const orderId = 'order-lic-1';
    const sessionId = 'cs_test_lic_1';

    const webhookEvent = {
      type: 'checkout.session.completed',
      data: { object: { id: sessionId, payment_intent: 'pi_lic_1' } },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
    email.sendPurchaseConfirmation.mockResolvedValue(true);

    // UPDATE order → RETURNING order row
    db.query
      .mockResolvedValueOnce({ rows: [{ id: orderId, user_id: userId, product_id: productId }] })
      // SELECT user email
      .mockResolvedValueOnce({ rows: [{ email: 'buyer@example.com' }] })
      // SELECT product title
      .mockResolvedValueOnce({ rows: [{ title: 'Test Product' }] })
      // INSERT license
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'test-sig')
      .set('content-type', 'application/json')
      .send(Buffer.from(JSON.stringify(webhookEvent)));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    // Verify license INSERT was called
    const insertCall = db.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO licenses')
    );
    expect(insertCall).toBeDefined();
    const licenseKey = insertCall[1][3];
    expect(licenseKey).toMatch(/^DM-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);

    // Verify email was called with licenseKey
    expect(email.sendPurchaseConfirmation).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({ licenseKey: expect.stringMatching(/^DM-/) })
    );
  });
});

// ---------------------------------------------------------------------------
// Task 8.5: GET /api/licenses scoping — user only sees own licenses
// ---------------------------------------------------------------------------

describe('GET /api/licenses scoping', () => {
  test('returns only licenses belonging to the authenticated user', async () => {
    const userId = 'user-lic-2';
    const otherUserId = 'user-lic-3';

    const myLicenses = [
      { id: 'lic-1', order_id: 'ord-1', user_id: userId, product_id: 'prod-1', license_key: 'DM-AAAA1111-BBBB2222-CCCC3333', created_at: new Date().toISOString(), product_title: 'My Product' },
    ];

    db.query.mockResolvedValueOnce({ rows: myLicenses });

    const res = await request(app)
      .get('/api/licenses')
      .set('Authorization', `Bearer ${userToken(userId)}`);

    expect(res.status).toBe(200);
    expect(res.body.licenses).toHaveLength(1);
    expect(res.body.licenses[0].user_id).toBe(userId);
    expect(res.body.licenses[0].license_key).toBe('DM-AAAA1111-BBBB2222-CCCC3333');
    expect(res.body.licenses[0].product_title).toBe('My Product');

    // Verify the query was scoped to the correct user
    const licenseQueryCall = db.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('FROM licenses') && call[1]
    );
    expect(licenseQueryCall).toBeDefined();
    expect(licenseQueryCall[1]).toContain(userId);
    expect(licenseQueryCall[1]).not.toContain(otherUserId);
  });

  test('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/licenses');
    expect(res.status).toBe(401);
  });

  test('returns empty array when user has no licenses', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/licenses')
      .set('Authorization', `Bearer ${userToken('user-no-licenses')}`);

    expect(res.status).toBe(200);
    expect(res.body.licenses).toEqual([]);
  });
});
