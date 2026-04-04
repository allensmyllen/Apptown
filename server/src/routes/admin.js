const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const { sendSupportMessageNotification } = require('../services/email');

const router = express.Router();
router.use(authenticate, requireAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
function handleUpload(req, res, next) {
  upload.single('file')(req, res, err => {
    if (err) return next(err);
    next();
  });
}
async function uploadAttachment(file) {
  if (!file) return null;
  const ext = file.originalname.split('.').pop();
  const key = 'support/' + uuidv4() + '.' + ext;
  await uploadFile(file.buffer, key, file.mimetype);
  const hasS3 = process.env.S3_ACCESS_KEY_ID && process.env.S3_ACCESS_KEY_ID !== 'your_access_key_id';
  if (hasS3) return 'https://' + process.env.S3_BUCKET + '.s3.' + process.env.S3_REGION + '.amazonaws.com/' + key;
  return '/uploads/' + key.replace(/\//g, '_');
}

/**
 * Validate that a string is a valid ISO 8601 date (YYYY-MM-DD).
 * Returns true only for strings that match the format and represent a real date.
 */
function isValidISODate(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

/**
 * Parse start/end query params, defaulting to last 30 days.
 * Returns { start, end } as YYYY-MM-DD strings, or null if invalid.
 */
function parseDateRange(query) {
  let { start, end } = query;

  if (!start && !end) {
    const now = new Date();
    end = now.toISOString().slice(0, 10);
    const s = new Date(now);
    s.setDate(s.getDate() - 29);
    start = s.toISOString().slice(0, 10);
    return { start, end, error: null };
  }

  if ((start && !isValidISODate(start)) || (end && !isValidISODate(end))) {
    return { start: null, end: null, error: 'Invalid date parameter' };
  }

  // Fill in missing bound with today / 30 days ago
  if (!start) {
    const s = new Date(end);
    s.setDate(s.getDate() - 29);
    start = s.toISOString().slice(0, 10);
  }
  if (!end) {
    end = new Date().toISOString().slice(0, 10);
  }

  return { start, end, error: null };
}

// GET /api/admin/metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const { start, end, error } = parseDateRange(req.query);
    if (error) return res.status(400).json({ error });

    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue, COUNT(*) as completed_orders
       FROM orders
       WHERE status = 'completed'
         AND completed_at >= $1::date
         AND completed_at < ($2::date + INTERVAL '1 day')`,
      [start, end]
    );
    // Only count verified users (not date-filtered — total registered users)
    const usersResult = await db.query(
      `SELECT COUNT(*) as registered_users
       FROM users
       WHERE email_verified = true
         AND created_at >= $1::date
         AND created_at < ($2::date + INTERVAL '1 day')`,
      [start, end]
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

// GET /api/admin/charts — revenue & orders per day + real page views
// Accepts optional ?start=YYYY-MM-DD&end=YYYY-MM-DD; defaults to last 30 days
router.get('/charts', async (req, res, next) => {
  try {
    const { start, end, error } = parseDateRange(req.query);
    if (error) return res.status(400).json({ error });

    const [revenueRows, viewRows] = await Promise.all([
      db.query(`
        SELECT DATE(completed_at) as day,
               SUM(amount_cents) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE status = 'completed'
          AND completed_at >= $1::date
          AND completed_at < ($2::date + INTERVAL '1 day')
        GROUP BY DATE(completed_at)
        ORDER BY day ASC
      `, [start, end]),
      db.query(`
        SELECT DATE(viewed_at) as day, COUNT(*) as views
        FROM page_views
        WHERE viewed_at >= $1::date
          AND viewed_at < ($2::date + INTERVAL '1 day')
        GROUP BY DATE(viewed_at)
        ORDER BY day ASC
      `, [start, end]).catch(() => ({ rows: [] })), // graceful if table doesn't exist yet
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

    // Build a series entry for every day in [start, end]
    const series = [];
    const cursor = new Date(start);
    const endDate = new Date(end);
    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      series.push({
        date: label,
        revenue: revenueMap[key]?.revenue ?? 0,
        orders: revenueMap[key]?.orders ?? 0,
        views: viewMap[key] ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
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

// GET /api/admin/support-tickets — list all tickets, filterable by status
router.get('/support-tickets', async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let whereClause = '';

    if (status && status !== 'all') {
      params.push(status);
      whereClause = `WHERE t.status = $${params.length}`;
    }

    const result = await db.query(
      `SELECT t.id,
              t.status,
              t.created_at,
              sl.license_key,
              p.title AS product_name,
              u.email AS user_email
       FROM tickets t
       JOIN support_licenses sl ON sl.id = t.support_license_id
       JOIN products p ON p.id = t.product_id
       JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    return res.json({ tickets: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/support-tickets/:id/messages — append admin message
router.post('/support-tickets/:id/messages', handleUpload, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body.body || '';

    if (!body.trim() && !req.file) {
      return res.status(400).json({ error: 'Message or file is required.' });
    }

    const ticketResult = await db.query(
      'SELECT t.*, u.email AS user_email, p.title AS product_title FROM tickets t JOIN users u ON u.id = t.user_id JOIN products p ON p.id = t.product_id WHERE t.id = $1',
      [id]
    );
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found.' });

    const ticket = ticketResult.rows[0];
    if (ticket.status === 'closed') return res.status(409).json({ error: 'Ticket is closed.' });

    const fileUrl = await uploadAttachment(req.file).catch(() => null);

    const msgResult = await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, body, file_url)
       VALUES ($1, $2, 'admin', $3, $4)
       RETURNING *`,
      [id, req.user.sub, body.trim(), fileUrl]
    );

    // Email the user
    try {
      await sendSupportMessageNotification(ticket.user_email, {
        productTitle: ticket.product_title,
        ticketId: id,
        messageBody: body.trim(),
        senderRole: 'admin',
      });
    } catch (emailErr) {
      console.error('[admin-support] email error:', emailErr.message);
    }

    return res.status(201).json({ message: msgResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/support-tickets/:id/close — close a ticket
router.patch('/support-tickets/:id/close', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE tickets SET status = 'closed' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    return res.json({ ticket: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.isValidISODate = isValidISODate;
