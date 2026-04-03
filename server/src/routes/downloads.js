const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { getSignedDownloadUrl } = require('../services/storage');

const router = express.Router();

const DOWNLOAD_TTL_SECONDS = 900; // 15 minutes

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

    // Get product file key
    const productResult = await db.query(
      'SELECT file_key FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { file_key } = productResult.rows[0];
    const signedUrl = await getSignedDownloadUrl(file_key, DOWNLOAD_TTL_SECONDS);

    return res.redirect(302, signedUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.DOWNLOAD_TTL_SECONDS = DOWNLOAD_TTL_SECONDS;
