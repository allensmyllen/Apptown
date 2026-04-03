/**
 * Unit tests for order service
 * Requirements: 4.1, 4.3, 4.5
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/db');
jest.mock('stripe');
jest.mock('../../src/services/email');

const db = require('../../src/db');
const emailService = require('../../src/services/email');

process.env.JWT_SECRET = 'test-secret-order';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
process.env.CLIENT_URL = 'http://localhost:5173';

const app = require('../../src/app');

function userToken(id = 'user-1') {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: id, email: 'user@example.com', role: 'user', iat, exp: iat + 86400 },
    process.env.JWT_SECRET
  );
}

const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => jest.fn(() => mockStripe));

// ── Req 4.1 — Stripe checkout session created on order initiation ─────────────

describe('Req 4.1 — Stripe checkout session created', () => {
  test('POST /api/orders creates a Stripe checkout session and returns URL', async () => {
    const product = {
      id: 'prod-1',
      title: 'Test Product',
      price_cents: 1999,
      published: true,
    };
    const sessionUrl = 'https://checkout.stripe.com/test-session';

    db.query
      .mockResolvedValueOnce({ rows: [product] }) // product lookup
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'pending' }] }); // insert order

    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: sessionUrl,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ productId: 'prod-1' });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe(sessionUrl);
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
  });
});

// ── Req 4.3 — Payment failure sets order status to failed ────────────────────

describe('Req 4.3 — Payment failure handling', () => {
  test('webhook payment_intent.payment_failed sets order status to failed', async () => {
    const failEvent = {
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_failed_123' } },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(failEvent);
    db.query.mockResolvedValueOnce({ rows: [] }); // update order

    const res = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'test-sig')
      .set('content-type', 'application/json')
      .send(Buffer.from(JSON.stringify(failEvent)));

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.any(Array)
    );
  });
});

// ── Req 4.5 — Confirmation email sent on order completion ────────────────────

describe('Req 4.5 — Confirmation email on order completion', () => {
  test('webhook checkout.session.completed sends confirmation email', async () => {
    const completedEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          payment_intent: 'pi_456',
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(completedEvent);
    emailService.sendPurchaseConfirmation.mockResolvedValue(true);

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'order-2', user_id: 'user-1', product_id: 'prod-1' }] }) // update order
      .mockResolvedValueOnce({ rows: [{ email: 'buyer@example.com' }] }) // user lookup
      .mockResolvedValueOnce({ rows: [{ title: 'Test Product' }] }); // product lookup

    const res = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'test-sig')
      .set('content-type', 'application/json')
      .send(Buffer.from(JSON.stringify(completedEvent)));

    expect(res.status).toBe(200);
    expect(emailService.sendPurchaseConfirmation).toHaveBeenCalledWith(
      'buyer@example.com',
      expect.objectContaining({ orderId: 'order-2', productTitle: 'Test Product' })
    );
  });
});
