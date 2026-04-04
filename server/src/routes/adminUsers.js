const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/users — list all users
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.display_name, u.role,
             COALESCE(u.status, 'active') as status,
             COALESCE(u.email_verified, false) as email_verified,
             u.last_ip, u.banned_at, u.banned_reason, u.created_at,
             COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') AS purchase_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return res.json({ users: result.rows });
  } catch (err) { next(err); }
});

// GET /api/admin/users/:id/purchases — purchase history + licenses
router.get('/:id/purchases', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT o.id as order_id, o.amount_cents, o.status, o.completed_at,
             p.title as product_title, p.id as product_id,
             l.license_key
      FROM orders o
      JOIN products p ON p.id = o.product_id
      LEFT JOIN licenses l ON l.order_id = o.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [req.params.id]);
    return res.json({ purchases: result.rows });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/status — ban, block, or activate
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!['active', 'banned', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    // Prevent admin from banning themselves
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'You cannot change your own status' });
    }
    await db.query(
      `UPDATE users SET status = $1,
        banned_at = CASE WHEN $1 IN ('banned','blocked') THEN NOW() ELSE NULL END,
        banned_reason = $2
       WHERE id = $3`,
      [status, reason || null, req.params.id]
    );
    const result = await db.query(
      'SELECT id, email, status, banned_at, banned_reason FROM users WHERE id = $1',
      [req.params.id]
    );
    return res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id — delete user
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    return res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
