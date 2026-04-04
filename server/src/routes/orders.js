const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendPurchaseConfirmation } = require('../services/email');

const router = express.Router();

const PAYSTACK_BASE = 'https://api.paystack.co';
const CART_MAX_ITEMS = 20;

function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return secret;
}

function generateLicenseKey() {
  const seg = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  return 'DM-' + seg() + '-' + seg() + '-' + seg();
}

function paystackRequest(method, path, data) {
  return axios({
    method,
    url: PAYSTACK_BASE + path,
    headers: {
      Authorization: 'Bearer ' + getPaystackSecret(),
      'Content-Type': 'application/json',
    },
    data,
  });
}

async function completeOrder(order) {
  const userResult = await db.query('SELECT email FROM users WHERE id = $1', [order.user_id]);
  const productResult = await db.query('SELECT title FROM products WHERE id = $1', [order.product_id]);
  if (userResult.rows.length > 0 && productResult.rows.length > 0) {
    const existing = await db.query('SELECT id FROM licenses WHERE order_id = $1', [order.id]);
    if (existing.rows.length === 0) {
      const licenseKey = generateLicenseKey();
      await db.query(
        'INSERT INTO licenses (order_id, user_id, product_id, license_key) VALUES ($1, $2, $3, $4)',
        [order.id, order.user_id, order.product_id, licenseKey]
      );
      await sendPurchaseConfirmation(userResult.rows[0].email, {
        orderId: order.id,
        productTitle: productResult.rows[0].title,
        licenseKey,
        amountCents: order.amount_cents,
        productId: order.product_id,
      });
    }
  }
}

// ── POST /api/orders — single product ────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId is required' });
    }

    const productResult = await db.query(
      'SELECT * FROM products WHERE id = $1 AND published = true', [productId]
    );
    if (productResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productResult.rows[0];

    // Block duplicate purchase
    const alreadyOwned = await db.query(
      "SELECT id FROM orders WHERE user_id = $1 AND product_id = $2 AND status = 'completed' LIMIT 1",
      [req.user.sub, productId]
    );
    if (alreadyOwned.rows.length > 0) {
      return res.status(409).json({ error: 'You already own this product. Visit My Downloads.' });
    }

    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.sub]);
    const userEmail = userResult.rows[0].email;

    const orderResult = await db.query(
      'INSERT INTO orders (user_id, product_id, amount_cents, currency) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.sub, productId, product.price_cents, 'ngn']
    );
    const order = orderResult.rows[0];

    const paystackRes = await paystackRequest('POST', '/transaction/initialize', {
      email: userEmail,
      amount: product.price_cents,
      currency: 'NGN',
      reference: order.id,
      callback_url: process.env.CLIENT_URL + '/checkout',
      metadata: { order_id: order.id, product_id: productId },
    });

    const { authorization_url, reference } = paystackRes.data.data;
    await db.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [reference, order.id]);

    return res.status(201).json({ url: authorization_url, order });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders/cart ─────────────────────────────────────────────────────
router.post('/cart', authenticate, async (req, res, next) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }
    if (productIds.length > CART_MAX_ITEMS) {
      return res.status(400).json({ error: `Cart cannot exceed ${CART_MAX_ITEMS} items` });
    }
    // Deduplicate and validate UUIDs
    const uniqueIds = [...new Set(productIds)].filter(id => typeof id === 'string' && id.length < 100);
    if (uniqueIds.length === 0) return res.status(400).json({ error: 'Invalid product IDs' });

    const placeholders = uniqueIds.map((_, i) => '$' + (i + 1)).join(', ');
    const productsResult = await db.query(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND published = true`,
      uniqueIds
    );

    if (productsResult.rows.length !== uniqueIds.length) {
      return res.status(404).json({ error: 'One or more products not found' });
    }

    const products = productsResult.rows;

    // Block duplicate cart purchase
    const ownedCheck = await db.query(
      `SELECT product_id FROM orders WHERE user_id = $1 AND product_id = ANY($2::uuid[]) AND status = 'completed' LIMIT 1`,
      [req.user.sub, uniqueIds]
    );
    if (ownedCheck.rows.length > 0) {
      return res.status(409).json({ error: 'You already own one or more products in this cart.' });
    }

    const totalCents = products.reduce((sum, p) => sum + p.price_cents, 0);

    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.sub]);
    const userEmail = userResult.rows[0].email;

    const cartRef = 'CART-' + crypto.randomBytes(8).toString('hex').toUpperCase();

    const orderIds = [];
    for (const product of products) {
      const orderResult = await db.query(
        'INSERT INTO orders (user_id, product_id, amount_cents, currency, cart_ref) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user.sub, product.id, product.price_cents, 'ngn', cartRef]
      );
      orderIds.push(orderResult.rows[0].id);
    }

    const paystackRes = await paystackRequest('POST', '/transaction/initialize', {
      email: userEmail,
      amount: totalCents,
      currency: 'NGN',
      reference: cartRef,
      callback_url: process.env.CLIENT_URL + '/checkout',
      metadata: { cart_ref: cartRef, order_ids: orderIds, product_count: products.length },
    });

    const { authorization_url } = paystackRes.data.data;
    return res.status(201).json({ url: authorization_url, cartRef, orderCount: products.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/orders/webhook ──────────────────────────────────────────────────
router.post('/webhook', async (req, res, next) => {
  try {
    // Guard: secret must be configured
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(500).json({ error: 'Payment not configured' });

    const signature = req.headers['x-paystack-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing signature' });

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      if (reference.startsWith('CART-')) {
        const result = await db.query(
          "UPDATE orders SET status = 'completed', completed_at = now(), stripe_payment_intent = $1 WHERE cart_ref = $2 AND status = 'pending' RETURNING *",
          [event.data.id.toString(), reference]
        );
        for (const order of result.rows) await completeOrder(order);
      } else {
        const result = await db.query(
          "UPDATE orders SET status = 'completed', completed_at = now(), stripe_payment_intent = $1 WHERE stripe_session_id = $2 AND status = 'pending' RETURNING *",
          [event.data.id.toString(), reference]
        );
        if (result.rows.length > 0) await completeOrder(result.rows[0]);
      }
    } else if (event.event === 'charge.failed') {
      const reference = event.data.reference;
      if (reference.startsWith('CART-')) {
        await db.query("UPDATE orders SET status = 'failed' WHERE cart_ref = $1", [reference]);
      } else {
        await db.query("UPDATE orders SET status = 'failed' WHERE stripe_session_id = $1", [reference]);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders/verify/:reference ────────────────────────────────────────
router.get('/verify/:reference', authenticate, async (req, res, next) => {
  try {
    const { reference } = req.params;

    // Validate reference belongs to this user before hitting Paystack
    let ownerCheck;
    if (reference.startsWith('CART-')) {
      ownerCheck = await db.query(
        'SELECT id FROM orders WHERE cart_ref = $1 AND user_id = $2 LIMIT 1',
        [reference, req.user.sub]
      );
    } else {
      ownerCheck = await db.query(
        'SELECT id FROM orders WHERE stripe_session_id = $1 AND user_id = $2 LIMIT 1',
        [reference, req.user.sub]
      );
    }

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Order not found or access denied' });
    }

    const paystackRes = await paystackRequest('GET', '/transaction/verify/' + reference);
    const data = paystackRes.data.data;

    if (data.status === 'success') {
      if (reference.startsWith('CART-')) {
        const result = await db.query(
          "UPDATE orders SET status = 'completed', completed_at = now(), stripe_payment_intent = $1 WHERE cart_ref = $2 AND status = 'pending' RETURNING *",
          [data.id.toString(), reference]
        );
        for (const order of result.rows) await completeOrder(order);
      } else {
        const result = await db.query(
          "UPDATE orders SET status = 'completed', completed_at = now(), stripe_payment_intent = $1 WHERE stripe_session_id = $2 AND status = 'pending' RETURNING *",
          [data.id.toString(), reference]
        );
        if (result.rows.length > 0) await completeOrder(result.rows[0]);
      }
      return res.json({ status: 'success' });
    }
    return res.json({ status: data.status });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/orders — user's completed orders ─────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT o.*, p.title as product_title, p.category, p.preview_link, p.image_url FROM orders o JOIN products p ON p.id = o.product_id WHERE o.user_id = $1 AND o.status = 'completed' ORDER BY o.created_at DESC",
      [req.user.sub]
    );
    return res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.generateLicenseKey = generateLicenseKey;
