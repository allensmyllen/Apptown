/**
 * Unit tests for order service
 * Requirements: 4.1, 4.3, 4.5
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('axios');
jest.mock('../../src/services/email');

const db = require('../../src/db');
const axios = require('axios');
const emailService = require('../../src/services/email');

process.env.JWT_SECRET = 'test-secret-order';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake_paystack';
process.env.CLIENT_URL = 'http://localhost:5173';

const app = require('../../src/app');

function userToken(id = 'user-1') {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: id, email: 'user@example.com', role: 'user', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

beforeEach(() => {
  db.query.mockReset();
  axios.mockReset();
  emailService.sendPurchaseConfirmation.mockReset();
});

// ── Req 4.1 — Paystack checkout session created on order initiation ───────────

describe('Req 4.1 — Paystack checkout session created', () => {
  test('POST /api/orders creates a Paystack transaction and returns URL', async () => {
    const product = {
      id: 'prod-1',
      title: 'Test Product',
      price_cents: 1999,
      published: true,
    };
    const authorizationUrl = 'https://checkout.paystack.com/test-session';

    db.query
      .mockResolvedValueOnce({ rows: [{ status: 'active', email_verified: true }] }) // authenticate middleware
      .mockResolvedValueOnce({ rows: [product] }) // product lookup
      .mockResolvedValueOnce({ rows: [] }) // already owned check
      .mockResolvedValueOnce({ rows: [{ email: 'user@example.com' }] }) // user email lookup
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'pending' }] }) // insert order
      .mockResolvedValueOnce({ rows: [] }); // update stripe_session_id

    axios.mockResolvedValue({
      data: {
        data: {
          authorization_url: authorizationUrl,
          reference: 'order-1',
        },
      },
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ productId: 'prod-1' });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe(authorizationUrl);
    expect(axios).toHaveBeenCalled();
  });
});

// ── Req 4.3 — Payment failure sets order status to failed ────────────────────

describe('Req 4.3 — Payment failure handling', () => {
  test('webhook charge.failed sets order status to failed', async () => {
    const failEvent = {
      event: 'charge.failed',
      data: { reference: 'order-ref-123' },
    };

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(failEvent))
      .digest('hex');

    db.query.mockResolvedValueOnce({ rows: [] }); // update order to failed

    const res = await request(app)
      .post('/api/orders/webhook')
      .set('x-paystack-signature', hash)
      .set('content-type', 'application/json')
      .send(failEvent);

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.any(Array)
    );
  });
});

// ── Req 4.5 — Confirmation email sent on order completion ────────────────────

describe('Req 4.5 — Confirmation email on order completion', () => {
  test('webhook charge.success sends confirmation email', async () => {
    const completedEvent = {
      event: 'charge.success',
      data: {
        reference: 'order-ref-456',
        id: 'txn_456',
      },
    };

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(completedEvent))
      .digest('hex');

    emailService.sendPurchaseConfirmation.mockResolvedValue(true);

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'order-2', user_id: 'user-1', product_id: 'prod-1', amount_cents: 1999 }] }) // update order to completed
      .mockResolvedValueOnce({ rows: [{ email: 'buyer@example.com' }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ title: 'Test Product' }] }) // product lookup
      .mockResolvedValueOnce({ rows: [] }) // check existing license
      .mockResolvedValueOnce({ rows: [] }); // insert license

    const res = await request(app)
      .post('/api/orders/webhook')
      .set('x-paystack-signature', hash)
      .set('content-type', 'application/json')
      .send(completedEvent);

    expect(res.status).toBe(200);
    expect(emailService.sendPurchaseConfirmation).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({ orderId: 'order-2', productTitle: 'Test Product' })
    );
  });
});
