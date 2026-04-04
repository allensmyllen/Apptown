const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendSupportLicenseConfirmation } = require('../services/email');

const router = express.Router();

const PAYSTACK_BASE = 'https://api.paystack.co';

function getPaystackSecret() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return secret;
}

function generateSupportLicenseKey() {
  const seg = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  return 'SL-' + seg() + '-' + seg() + '-' + seg();
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

// ── POST /api/support-licenses/purchase ──────────────────────────────────────
router.post('/purchase', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId is required' });
    }

    // 1. Check user owns the product (completed order exists)
    const ownershipResult = await db.query(
      "SELECT id FROM orders WHERE user_id = $1 AND product_id = $2 AND status = 'completed' LIMIT 1",
      [req.user.sub, productId]
    );
    if (ownershipResult.rows.length === 0) {
      return res.status(403).json({ error: 'You must own this product to purchase a support license.' });
    }

    // 2. Check product has support_price_cents
    const productResult = await db.query(
      'SELECT id, title, support_price_cents FROM products WHERE id = $1',
      [productId]
    );
    if (productResult.rows.length === 0 || productResult.rows[0].support_price_cents == null) {
      return res.status(404).json({ error: 'This product does not offer a support license.' });
    }
    const product = productResult.rows[0];

    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.sub]);
    const userEmail = userResult.rows[0].email;

    // 3. Create a pending support_license record
    const licenseKey = generateSupportLicenseKey();
    const randomRef = crypto.randomBytes(8).toString('hex').toUpperCase();
    const paystackRef = 'SLREF-' + randomRef;

    await db.query(
      'INSERT INTO support_licenses (user_id, product_id, license_key, paystack_ref) VALUES ($1, $2, $3, $4)',
      [req.user.sub, productId, licenseKey, paystackRef]
    );

    // 4. Initialize Paystack payment
    const paystackRes = await paystackRequest('POST', '/transaction/initialize', {
      email: userEmail,
      amount: product.support_price_cents,
      currency: 'NGN',
      reference: paystackRef,
      callback_url: process.env.CLIENT_URL + '/support',
      metadata: { product_id: productId, license_key: licenseKey },
    });

    const { authorization_url } = paystackRes.data.data;

    // 5. Return the Paystack authorization URL
    return res.status(201).json({ url: authorization_url });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/support-licenses/webhook ───────────────────────────────────────
router.post('/webhook', async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(500).json({ error: 'Payment not configured' });

    const signature = req.headers['x-paystack-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing signature' });

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;

      if (reference.startsWith('SLREF-')) {
        // Look up the pending support license by paystack_ref
        const licenseResult = await db.query(
          'SELECT sl.*, u.email FROM support_licenses sl JOIN users u ON u.id = sl.user_id WHERE sl.paystack_ref = $1 LIMIT 1',
          [reference]
        );

        if (licenseResult.rows.length > 0) {
          const license = licenseResult.rows[0];

          const productResult = await db.query(
            'SELECT title FROM products WHERE id = $1',
            [license.product_id]
          );
          const productTitle = productResult.rows.length > 0 ? productResult.rows[0].title : 'your product';

          await sendSupportLicenseConfirmation(license.email, {
            licenseKey: license.license_key,
            productTitle,
          });
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/support-licenses/verify-payment ─────────────────────────────────
// Called after Paystack redirect to activate the license
router.get('/verify-payment', authenticate, async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'reference is required' });

    // Validate the reference belongs to this user
    const licenseResult = await db.query(
      'SELECT sl.*, u.email FROM support_licenses sl JOIN users u ON u.id = sl.user_id WHERE sl.paystack_ref = $1 AND sl.user_id = $2 LIMIT 1',
      [reference, req.user.sub]
    );
    if (licenseResult.rows.length === 0) {
      return res.status(403).json({ error: 'Payment not found or access denied' });
    }

    const license = licenseResult.rows[0];

    // Verify with Paystack
    const paystackRes = await paystackRequest('GET', '/transaction/verify/' + reference);
    const data = paystackRes.data.data;

    if (data.status === 'success') {
      // Send confirmation email if not already sent (idempotent check via a flag or just re-send)
      const productResult = await db.query('SELECT title FROM products WHERE id = $1', [license.product_id]);
      const productTitle = productResult.rows.length > 0 ? productResult.rows[0].title : 'your product';

      try {
        await sendSupportLicenseConfirmation(license.email, {
          licenseKey: license.license_key,
          productTitle,
        });
      } catch (emailErr) {
        // Don't fail the request if email fails
        console.error('[support-license] email error:', emailErr.message);
      }

      return res.json({
        status: 'success',
        license_key: license.license_key,
        product_title: productTitle,
      });
    }

    return res.json({ status: data.status });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/support-licenses/verify ─────────────────────────────────────────
router.get('/verify', authenticate, async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const result = await db.query(
      `SELECT sl.id, sl.license_key, sl.product_id, sl.requests_used, sl.requests_total,
              p.title AS product_title
       FROM support_licenses sl
       JOIN products p ON p.id = sl.product_id
       WHERE sl.license_key = $1 AND sl.user_id = $2
       LIMIT 1`,
      [key, req.user.sub]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or unrecognised license key.' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/support-licenses ─────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT sl.id, sl.license_key, sl.product_id, sl.requests_used, sl.requests_total, sl.created_at,
              p.title AS product_title
       FROM support_licenses sl
       JOIN products p ON p.id = sl.product_id
       WHERE sl.user_id = $1
       ORDER BY sl.created_at DESC`,
      [req.user.sub]
    );

    return res.json({ licenses: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.generateSupportLicenseKey = generateSupportLicenseKey;
