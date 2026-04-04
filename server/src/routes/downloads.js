const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getSignedDownloadUrl } = require('../services/storage');

const router = express.Router();
const DOWNLOAD_TTL_SECONDS = 900; // 15 minutes

const IS_DEV_STORAGE = !process.env.S3_ACCESS_KEY_ID ||
  process.env.S3_ACCESS_KEY_ID === 'your_access_key_id';

const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');

// GET /api/downloads/:productId
router.get('/:productId', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.sub;

    // Verify user has a completed order for this product
    const orderResult = await db.query(
      `SELECT o.id FROM orders o
       WHERE o.user_id = $1 AND o.product_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [userId, productId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Purchase required to download' });
    }

    // Get product file key and title
    const productResult = await db.query(
      'SELECT file_key, title FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { file_key, title } = productResult.rows[0];

    if (IS_DEV_STORAGE) {
      // Sanitize file_key to prevent path traversal
      const safeName = path.basename(file_key.replace(/\//g, '_'));
      const localPath = path.join(LOCAL_UPLOADS_DIR, safeName);

      // Ensure resolved path is still inside uploads dir
      const resolved = path.resolve(localPath);
      const uploadsResolved = path.resolve(LOCAL_UPLOADS_DIR);
      if (!resolved.startsWith(uploadsResolved + path.sep) && resolved !== uploadsResolved) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      const originalName = path.basename(file_key);
      res.setHeader('Content-Disposition', 'attachment; filename="' + originalName + '"');
      return res.sendFile(localPath);
    }

    // Production: redirect to S3 signed URL
    const signedUrl = await getSignedDownloadUrl(file_key, DOWNLOAD_TTL_SECONDS);
    return res.redirect(302, signedUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.DOWNLOAD_TTL_SECONDS = DOWNLOAD_TTL_SECONDS;
