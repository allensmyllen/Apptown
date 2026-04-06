const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Shared brand constants ────────────────────────────────────────────────────
const BRAND_DARK   = '#0D0D1A';
const BRAND_PRIMARY = '#3781EE';
const CLIENT_URL   = () => process.env.CLIENT_URL || 'https://apptown.com';

// ── Base layout wrapper ───────────────────────────────────────────────────────
function layout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Town</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_DARK};border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:${BRAND_PRIMARY};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-right:8px;">⚡</span>
                    <span style="color:#fff;font-size:16px;font-weight:700;vertical-align:middle;">App Town</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                © 2026 Apptown by Youtech Design Agency. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                <a href="${CLIENT_URL()}/terms-of-use" style="color:#9ca3af;text-decoration:none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="${CLIENT_URL()}/privacy-policy" style="color:#9ca3af;text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${CLIENT_URL()}/license-use" style="color:#9ca3af;text-decoration:none;">License</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Button helper ─────────────────────────────────────────────────────────────
function btn(text, url, color = BRAND_PRIMARY) {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">${text}</a>`;
}

// ── Divider ───────────────────────────────────────────────────────────────────
const divider = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`;

// ── 1. Welcome email ──────────────────────────────────────────────────────────
async function sendWelcome(to, displayName) {
  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Welcome to App Town 👋</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi <strong>${displayName}</strong>, your account is all set. You now have access to thousands of premium digital assets built by world-class developers.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;">
          <span style="color:${BRAND_PRIMARY};font-size:16px;margin-right:10px;">✓</span>
          <span style="font-size:14px;color:#374151;">Browse thousands of premium products</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="color:${BRAND_PRIMARY};font-size:16px;margin-right:10px;">✓</span>
          <span style="font-size:14px;color:#374151;">Instant downloads after purchase</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="color:${BRAND_PRIMARY};font-size:16px;margin-right:10px;">✓</span>
          <span style="font-size:14px;color:#374151;">Unique license key for every purchase</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <span style="color:${BRAND_PRIMARY};font-size:16px;margin-right:10px;">✓</span>
          <span style="font-size:14px;color:#374151;">Secure payments via Paystack</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;text-align:center;">
      ${btn('Browse the Marketplace', CLIENT_URL())}
    </p>

    ${divider}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      If you didn't create this account, you can safely ignore this email.
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'Welcome to App Town 🎉',
    html,
  });
}

// ── 2. Purchase confirmation + receipt + invoice ───────────────────────────────
async function sendPurchaseConfirmation(to, orderDetails) {
  const { orderId, productTitle, licenseKey, amountCents, productId } = orderDetails;
  const amount = amountCents
    ? `₦${(amountCents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
    : null;
  const invoiceDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortId = orderId.slice(0, 8).toUpperCase();
  const downloadsUrl = `${CLIENT_URL()}/downloads`;
  const downloadUrl  = productId
    ? `${CLIENT_URL()}/api/downloads/${productId}`
    : downloadsUrl;

  const html = layout(`
    <!-- Success banner -->
    <div style="background:${BRAND_PRIMARY};border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;">✓</div>
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;">Payment Successful!</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);">Your order has been confirmed.</p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Thank you for your purchase. Your product is ready to download and your license key is included below.
    </p>

    <!-- Product card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Product</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${productTitle}</p>
        </td>
      </tr>
      ${licenseKey ? `
      <tr>
        <td style="padding:0 24px 20px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">License Key</p>
          <div style="background:#fff;border:1px solid #d1d5db;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:14px;font-weight:700;color:#111827;letter-spacing:1px;">${licenseKey}</div>
          <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">Keep this safe — it's your proof of ownership.</p>
        </td>
      </tr>` : ''}
    </table>

    <!-- Download button -->
    <p style="margin:0 0 24px;text-align:center;">
      ${btn('⬇ Download Your Product', downloadsUrl)}
    </p>

    ${divider}

    <!-- Receipt / Invoice -->
    <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">Receipt &amp; Invoice</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#374151;">
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Invoice #</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;font-family:monospace;">${shortId}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Date</td>
        <td style="padding:6px 0;text-align:right;">${invoiceDate}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Product</td>
        <td style="padding:6px 0;text-align:right;">${productTitle}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#6b7280;">Order ID</td>
        <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:11px;">${orderId}</td>
      </tr>
      ${amount ? `
      <tr>
        <td colspan="2" style="padding:4px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;" /></td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:700;color:#111827;font-size:14px;">Total Paid</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;color:${BRAND_PRIMARY};font-size:16px;">${amount}</td>
      </tr>` : ''}
    </table>

    ${divider}
    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
      Need help? Reply to this email or visit our
      <a href="${CLIENT_URL()}/return-policy" style="color:${BRAND_PRIMARY};text-decoration:none;">Return Policy</a>.
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Your purchase: Receipt #${shortId}`,
    html,
  });
}

// ── 3. OTP email ──────────────────────────────────────────────────────────────
async function sendOtp(to, otp, purpose) {
  const isReset = purpose === 'reset_password';
  const subject = isReset ? 'Your password reset code — App Town' : 'Verify your email — App Town';
  const heading = isReset ? 'Password Reset Code' : 'Verify Your Email';
  const body    = isReset
    ? 'Use the code below to reset your App Town password. It expires in <strong>10 minutes</strong>.'
    : 'Use the code below to verify your email address and complete your App Town sign-up. It expires in <strong>10 minutes</strong>.';

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">${body}</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:28px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">Your verification code</p>
      <span style="font-size:40px;font-weight:700;letter-spacing:12px;font-family:monospace;color:#111827;">${otp}</span>
    </div>

    ${divider}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

// ── 4. Support license confirmation ───────────────────────────────────────────
async function sendSupportLicenseConfirmation(to, { licenseKey, productTitle }) {
  const html = layout(`
    <!-- Success banner -->
    <div style="background:${BRAND_DARK};border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
      <div style="width:52px;height:52px;background:${BRAND_PRIMARY};border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;">🛡</div>
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;">Support License Activated!</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">Your support license for <strong style="color:#fff;">${productTitle}</strong> is ready.</p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      Thank you for your purchase. Use the license key below to access support on the Help Center.
    </p>

    <!-- License key card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Product</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${productTitle}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 20px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Support License Key</p>
          <div style="background:#fff;border:2px solid ${BRAND_PRIMARY};border-radius:6px;padding:12px 16px;font-family:monospace;font-size:15px;font-weight:700;color:#111827;letter-spacing:1.5px;text-align:center;">${licenseKey}</div>
          <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">Keep this safe — you'll need it to submit support requests.</p>
        </td>
      </tr>
    </table>

    <!-- Help Center button -->
    <p style="margin:0 0 24px;text-align:center;">
      ${btn('Go to Help Center', `${CLIENT_URL()}/support`)}
    </p>

    ${divider}
    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
      Need help? Visit our <a href="${CLIENT_URL()}/support" style="color:${BRAND_PRIMARY};text-decoration:none;">Help Center</a> to get started.
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Your Support License for ${productTitle} — App Town`,
    html,
  });
}

// ── 5. Support message notification ──────────────────────────────────────────
async function sendSupportMessageNotification(to, { productTitle, ticketId, messageBody, senderRole }) {
  const isAdminReply = senderRole === 'admin';
  const subject = isAdminReply
    ? `New reply on your support ticket — ${productTitle}`
    : `New support message — ${productTitle}`;

  const html = layout(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
      ${isAdminReply ? 'You have a new reply' : 'New support message'}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.6;">
      ${isAdminReply
        ? `The support team has replied to your ticket for <strong>${productTitle}</strong>.`
        : `A user has sent a message on their support ticket for <strong>${productTitle}</strong>.`
      }
    </p>

    ${messageBody ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${messageBody}</p>
    </div>` : ''}

    <p style="margin:0 0 24px;text-align:center;">
      ${btn('View Ticket', `${CLIENT_URL()}/support`)}
    </p>

    ${divider}
    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
      Ticket ID: <span style="font-family:monospace;">${ticketId.slice(0, 8)}</span>
    </p>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

module.exports = { sendWelcome, sendPurchaseConfirmation, sendOtp, sendSupportLicenseConfirmation, sendSupportMessageNotification };
