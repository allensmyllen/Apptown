const express = require('express');
const { z } = require('zod');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // gets :productId from parent

// GET /api/products/:productId/reviews
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.rating, r.body, r.created_at,
              u.display_name, u.email
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );

    const reviews = result.rows.map(r => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      author: r.display_name || r.email.split('@')[0],
      initials: (r.display_name || r.email)[0].toUpperCase(),
    }));

    // Aggregate stats
    const total = reviews.length;
    const avg = total > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
      : null;

    return res.json({ reviews, avg_rating: avg, total_reviews: total });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:productId/reviews — must have purchased the product
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { rating, body } = parsed.data;
    const { productId } = req.params;

    // Must have a completed order for this product
    const owned = await db.query(
      "SELECT id FROM orders WHERE user_id = $1 AND product_id = $2 AND status = 'completed' LIMIT 1",
      [req.user.sub, productId]
    );
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'You must purchase this product before leaving a review.' });
    }

    const result = await db.query(
      `INSERT INTO reviews (product_id, user_id, rating, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = $3, body = $4, created_at = now()
       RETURNING *`,
      [productId, req.user.sub, rating, body || null]
    );

    return res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
