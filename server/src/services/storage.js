const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer
 * @param {string} key - object key
 * @param {string} contentType
 */
async function uploadFile(buffer, key, contentType) {
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
 * @param {string} key
 * @param {number} ttlSeconds
 */
async function getSignedDownloadUrl(key, ttlSeconds = 900) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: ttlSeconds }
  );
}

module.exports = { uploadFile, getSignedDownloadUrl };
