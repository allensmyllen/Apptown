const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');
const { sendSupportMessageNotification } = require('../services/email');

const router = express.Router();

const MAX_ATTACH_SIZE = 10 * 1024 * 1024; // 10 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACH_SIZE } });

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 10 MB)' });
    }
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
  if (hasS3) {
    return 'https://' + process.env.S3_BUCKET + '.s3.' + process.env.S3_REGION + '.amazonaws.com/' + key;
  }
  return '/uploads/' + key.replace(/\//g, '_');
}

// ── POST /api/support-tickets ─────────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { supportLicenseId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const licenseResult = await db.query(
      `SELECT sl.id, sl.user_id, sl.product_id, sl.requests_used, sl.requests_total
       FROM support_licenses sl WHERE sl.id = $1 AND sl.user_id = $2 LIMIT 1`,
      [supportLicenseId, req.user.sub]
    );
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Support license not found.' });
    }

    const license = licenseResult.rows[0];
    if (license.requests_used >= license.requests_total) {
      return res.status(403).json({ error: 'No support requests remaining.' });
    }

    const ticketResult = await db.query(
      `INSERT INTO tickets (support_license_id, user_id, product_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, support_license_id, user_id, product_id, message, status, created_at`,
      [license.id, req.user.sub, license.product_id, message.trim()]
    );
    const ticket = ticketResult.rows[0];

    await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, body) VALUES ($1, $2, 'user', $3)`,
      [ticket.id, req.user.sub, message.trim()]
    );

    await db.query('UPDATE support_licenses SET requests_used = requests_used + 1 WHERE id = $1', [license.id]);

    return res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/support-tickets ──────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.status, p.title AS product_title, t.created_at,
              (SELECT tm.body FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS latest_message,
              (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id AND tm.sender_role = 'admin' AND tm.created_at > COALESCE(
                (SELECT MAX(tm2.created_at) FROM ticket_messages tm2 WHERE tm2.ticket_id = t.id AND tm2.sender_role = 'user'), '1970-01-01'
              )) AS unread_count
       FROM tickets t
       JOIN products p ON p.id = t.product_id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.sub]
    );
    return res.json({ tickets: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/support-tickets/:id/messages ─────────────────────────────────────
router.get('/:id/messages', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticketResult = await db.query('SELECT id, user_id FROM tickets WHERE id = $1 LIMIT 1', [id]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found.' });

    const ticket = ticketResult.rows[0];
    if (ticket.user_id !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const messagesResult = await db.query(
      `SELECT tm.id, tm.sender_role, tm.body, tm.file_url, tm.created_at, u.name AS sender_name
       FROM ticket_messages tm
       JOIN users u ON u.id = tm.sender_id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [id]
    );
    return res.json({ messages: messagesResult.rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/support-tickets/:id/messages ────────────────────────────────────
router.post('/:id/messages', authenticate, handleUpload, async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body.body || '';

    const ticketResult = await db.query(
      'SELECT t.*, u.email AS user_email, p.title AS product_title FROM tickets t JOIN users u ON u.id = t.user_id JOIN products p ON p.id = t.product_id WHERE t.id = $1 LIMIT 1',
      [id]
    );
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found.' });

    const ticket = ticketResult.rows[0];
    if (ticket.status === 'closed') return res.status(409).json({ error: 'Ticket is closed.' });

    const isOwner = ticket.user_id === req.user.sub;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied.' });

    if (!body.trim() && !req.file) return res.status(400).json({ error: 'Message or file is required.' });

    const senderRole = isAdmin ? 'admin' : 'user';
    const fileUrl = await uploadAttachment(req.file).catch(() => null);

    const messageResult = await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, body, file_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, ticket_id, sender_id, sender_role, body, file_url, created_at`,
      [id, req.user.sub, senderRole, body.trim(), fileUrl]
    );

    const msg = messageResult.rows[0];

    // Send email notification to the other party
    try {
      if (isAdmin) {
        // Notify user that admin replied
        await sendSupportMessageNotification(ticket.user_email, {
          productTitle: ticket.product_title,
          ticketId: id,
          messageBody: body.trim(),
          senderRole: 'admin',
        });
      }
      // (user replies don't email admin — admin checks the dashboard)
    } catch (emailErr) {
      console.error('[support] email notification error:', emailErr.message);
    }

    return res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
