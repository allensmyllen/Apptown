/**
 * Integration test — full purchase flow
 * Register → login → browse products → initiate order → simulate Stripe webhook → verify order completed → request download URL
 * Requirements: 1.2, 2.1, 4.1, 4.2, 5.1
 */

const request = require('supertest');

jest.mock('../../src/db');
jest.mock('stripe');
jest.mock('../../src/services/storage');
jest.mock('../../src/services/email');

const db = require('../../src/db');
const storage = require('../../src/services/storage');
const email = require('../../src/services/email');

process.env.JWT_SECRET = 'test-integration-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
process.env.CLIENT_URL = 'http://localhost:5173';

const mockStripe = {
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

const app = require('../../src/app');

describe('Full purchase flow', () => {
  test('register → login → browse → order → webhook → download', async () => {
    const userId = 'user-integration-1';
    const productId = 'prod-integration-1';
    const orderId = 'order-integration-1';
    const sessionId = 'cs_test_integration';
    const fileKey = 'products/test.zip';
    const signedUrl = 'https://s3.example.com/test.zip?sig=abc';

    // 1. Register
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no duplicate email
      .mockResolvedValueOnce({ rows: [{ id: userId, email: 'buyer@example.com', role: 'user' }] });

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'buyer@example.com', display_name: 'Buyer', password: 'password123' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    const token = registerRes.body.token;

    // 2. Browse products
    db.query.mockResolvedValueOnce({
      rows: [{ id: productId, title: 'Test Product', price_cents: 999, category: 'theme', published: true }],
    });

    const browseRes = await request(app).get('/api/products');
    expect(browseRes.status).toBe(200);
    expect(browseRes.body.products.length).toBeGreaterThan(0);

    // 3. Initiate order
    db.query
      .mockResolvedValueOnce({ rows: [{ id: productId, title: 'Test Product', price_cents: 999, published: true }] })
      .mockResolvedValueOnce({ rows: [{ id: orderId, status: 'pending', stripe_session_id: sessionId }] });

    mockStripe.checkout.sessions.create.mockResolvedValue({ id: sessionId, url: 'https://checkout.stripe.com/test' });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.url).toContain('stripe.com');

    // 4. Simulate Stripe webhook — checkout.session.completed
    const webhookEvent = {
      type: 'checkout.session.completed',
      data: { object: { id: sessionId, payment_intent: 'pi_test_1' } },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
    email.sendPurchaseConfirmation.mockResolvedValue(true);

    db.query
      .mockResolvedValueOnce({ rows: [{ id: orderId, user_id: userId, product_id: productId }] })
      .mockResolvedValueOnce({ rows: [{ email: 'buyer@example.com' }] })
      .mockResolvedValueOnce({ rows: [{ title: 'Test Product' }] });

    const webhookRes = await request(app)
      .post('/api/orders/webhook')
      .set('stripe-signature', 'test-sig')
      .set('content-type', 'application/json')
      .send(Buffer.from(JSON.stringify(webhookEvent)));

    expect(webhookRes.status).toBe(200);
    expect(email.sendPurchaseConfirmation).toHaveBeenCalled();

    // 5. Request download URL
    storage.getSignedDownloadUrl.mockResolvedValue(signedUrl);

    db.query
      .mockResolvedValueOnce({ rows: [{ id: orderId }] }) // completed order check
      .mockResolvedValueOnce({ rows: [{ file_key: fileKey }] }); // product file key

    const downloadRes = await request(app)
      .get(`/api/downloads/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .redirects(0);

    expect(downloadRes.status).toBe(302);
    expect(downloadRes.headers.location).toBe(signedUrl);
  });
});
