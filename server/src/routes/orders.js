const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendPurchaseConfirmation } = require('../services/email');

const router = express.Router();

// POST /api/orders — initiate purchase
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const productResult = await db.query(
      'SELECT * FROM products WHERE id = $1 AND published = true',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productResult.rows[0];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: product.title },
          unit_amount: product.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/checkout?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/checkout?canceled=true`,
    });

    // Create pending order
    const orderResult = await db.query(
      `INSERT INTO orders (user_id, product_id, amount_cents, stripe_session_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.sub, productId, product.price_cents, session.id]
    );

    return res.status(201).json({ url: session.url, order: orderResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/webhook — Stripe webhook
router.post('/webhook', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const result = await db.query(
        `UPDATE orders SET status = 'completed', completed_at = now(),
         stripe_payment_intent = $1
         WHERE stripe_session_id = $2 RETURNING *`,
        [session.payment_intent, session.id]
      );

      if (result.rows.length > 0) {
        const order = result.rows[0];
        // Get user email and product title for confirmation email
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [order.user_id]);
        const productResult = await db.query('SELECT title FROM products WHERE id = $1', [order.product_id]);
        if (userResult.rows.length > 0 && productResult.rows.length > 0) {
          await sendPurchaseConfirmation(userResult.rows[0].email, {
            orderId: order.id,
            productTitle: productResult.rows[0].title,
          });
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      await db.query(
        `UPDATE orders SET status = 'failed'
         WHERE stripe_payment_intent = $1`,
        [paymentIntent.id]
      );
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders — user order history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.*, p.title as product_title, p.category, p.preview_link
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.sub]
    );
    return res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders — admin order list with date range filter
router.get('/admin', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = `SELECT o.id, o.amount_cents, o.status, o.completed_at, o.created_at,
                        u.email as buyer_email, p.title as product_title
                 FROM orders o
                 JOIN users u ON u.id = o.user_id
                 JOIN products p ON p.id = o.product_id
                 WHERE 1=1`;
    const params = [];

    if (from) {
      params.push(from);
      query += ` AND o.completed_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND o.completed_at <= $${params.length}`;
    }
    query += ' ORDER BY o.created_at DESC';

    const result = await db.query(query, params);
    return res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
