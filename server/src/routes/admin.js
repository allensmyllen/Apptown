const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const revenueResult = await db.query(
      "SELECT COALESCE(SUM(amount_cents), 0) as total_revenue, COUNT(*) as completed_orders FROM orders WHERE status = 'completed'"
    );
    // Only count verified users
    const usersResult = await db.query(
      "SELECT COUNT(*) as registered_users FROM users WHERE email_verified = true"
    );

    return res.json({
      total_revenue: parseInt(revenueResult.rows[0].total_revenue, 10),
      completed_orders: parseInt(revenueResult.rows[0].completed_orders, 10),
      registered_users: parseInt(usersResult.rows[0].registered_users, 10),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/charts — revenue & orders per day (last 30 days) + real page views
router.get('/charts', async (req, res, next) => {
  try {
    const [revenueRows, viewRows] = await Promise.all([
      db.query(`
        SELECT DATE(completed_at) as day,
               SUM(amount_cents) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE status = 'completed'
          AND completed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
        ORDER BY day ASC
      `),
      db.query(`
        SELECT DATE(viewed_at) as day, COUNT(*) as views
        FROM page_views
        WHERE viewed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(viewed_at)
        ORDER BY day ASC
      `).catch(() => ({ rows: [] })), // graceful if table doesn't exist yet
    ]);

    const revenueMap = {};
    for (const row of revenueRows.rows) {
      revenueMap[row.day.toISOString().slice(0, 10)] = {
        revenue: parseInt(row.revenue, 10),
        orders: parseInt(row.orders, 10),
      };
    }

    const viewMap = {};
    for (const row of viewRows.rows) {
      viewMap[row.day.toISOString().slice(0, 10)] = parseInt(row.views, 10);
    }

    const series = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      series.push({
        date: label,
        revenue: revenueMap[key]?.revenue ?? 0,
        orders: revenueMap[key]?.orders ?? 0,
        views: viewMap[key] ?? 0,
      });
    }

    return res.json({ series });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders
router.get('/orders', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let sql = `SELECT o.id, o.amount_cents, o.status, o.completed_at, o.created_at,
                      u.email as buyer_email, p.title as product_title,
                      l.license_key
               FROM orders o
               JOIN users u ON u.id = o.user_id
               JOIN products p ON p.id = o.product_id
               LEFT JOIN licenses l ON l.order_id = o.id
               WHERE 1=1`;
    const params = [];

    if (from) {
      params.push(from);
      sql += ' AND o.completed_at >= $' + params.length;
    }
    if (to) {
      params.push(to);
      sql += ' AND o.completed_at <= $' + params.length;
    }
    sql += ' ORDER BY o.created_at DESC';

    const result = await db.query(sql, params);
    return res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/export — CSV export
router.get('/orders/export', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT o.id, u.email as buyer_email, p.title as product_title, o.amount_cents, o.status FROM orders o JOIN users u ON u.id = o.user_id JOIN products p ON p.id = o.product_id ORDER BY o.created_at DESC'
    );

    const header = 'order_id,buyer_email,product_title,amount_cents,status';
    const rows = result.rows.map(
      (o) => '"' + o.id + '","' + o.buyer_email + '","' + o.product_title.replace(/"/g, '""') + '",' + o.amount_cents + ',"' + o.status + '"'
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
