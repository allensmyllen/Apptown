const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Detect dev mode: use local storage when S3 credentials are missing/placeholder
const IS_DEV_STORAGE = !process.env.S3_ACCESS_KEY_ID ||
  process.env.S3_ACCESS_KEY_ID === 'your_access_key_id';

const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (IS_DEV_STORAGE) {
  // Ensure uploads directory exists
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
  console.log('[storage] Using LOCAL file storage (dev mode). Set S3 credentials for production.');
}

const s3 = IS_DEV_STORAGE ? null : new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

/**
 * Upload a file buffer to S3 (or local disk in dev mode).
 * @param {Buffer} buffer
 * @param {string} key - object key (e.g. "products/uuid-file.zip")
 * @param {string} contentType
 * @returns {string} the key
 */
async function uploadFile(buffer, key, contentType) {
  if (IS_DEV_STORAGE) {
    // Save to local uploads directory, preserving the key structure
    const localPath = path.join(LOCAL_UPLOADS_DIR, key.replace(/\//g, '_'));
    fs.writeFileSync(localPath, buffer);
    return key;
  }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return key;
}

/**
 * Generate a pre-signed download URL valid for ttlSeconds.
 * In dev mode, returns a local file path (not a real signed URL).
 * @param {string} key
 * @param {number} ttlSeconds
 */
async function getSignedDownloadUrl(key, ttlSeconds = 900) {
  if (IS_DEV_STORAGE) {
    // In dev, return a placeholder URL — actual download won't work without S3
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return `${clientUrl}/dev-download/${encodeURIComponent(key)}`;
  }

  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
}

module.exports = { uploadFile, getSignedDownloadUrl };
