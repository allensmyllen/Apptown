const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // SSL on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a purchase confirmation email.
 * @param {string} to - recipient email
 * @param {{ orderId: string, productTitle: string }} orderDetails
 */
async function sendPurchaseConfirmation(to, orderDetails) {
  const { orderId, productTitle } = orderDetails;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Your purchase: ${productTitle}`,
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Product: <strong>${productTitle}</strong></p>
      <p>You can download your product from your <a href="${process.env.CLIENT_URL}/downloads">My Downloads</a> page.</p>
    `,
  });
}

module.exports = { sendPurchaseConfirmation };
