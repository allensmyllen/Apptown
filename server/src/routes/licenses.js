const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/licenses — returns the authenticated user's licenses joined with product title
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT l.id, l.order_id, l.user_id, l.product_id, l.license_key, l.created_at,
              p.title as product_title
       FROM licenses l
       JOIN products p ON p.id = l.product_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.sub]
    );
    return res.json({ licenses: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
