const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue,
              COUNT(*) as completed_orders
       FROM orders WHERE status = 'completed'`
    );
    const usersResult = await db.query('SELECT COUNT(*) as registered_users FROM users');

    return res.json({
      total_revenue: parseInt(revenueResult.rows[0].total_revenue, 10),
      completed_orders: parseInt(revenueResult.rows[0].completed_orders, 10),
      registered_users: parseInt(usersResult.rows[0].registered_users, 10),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders
router.get('/orders', async (req, res, next) => {
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
      query += ' AND o.completed_at >= $' + params.length;
    }
    if (to) {
      params.push(to);
      query += ' AND o.completed_at <= $' + params.length;
    }
    query += ' ORDER BY o.created_at DESC';

    const result = await db.query(query, params);
    return res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/export — CSV export
router.get('/orders/export', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.id, u.email as buyer_email, p.title as product_title,
              o.amount_cents, o.status
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN products p ON p.id = o.product_id
       ORDER BY o.created_at DESC`
    );

    const header = 'order_id,buyer_email,product_title,amount_cents,status';
    const rows = result.rows.map(
      (o) =>
        `"${o.id}","${o.buyer_email}","${o.product_title.replace(/"/g, '""')}",${o.amount_cents},"${o.status}"`
    );
    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
