/**
 * ============================================================
 * EmailService — Yogkart Healthcare
 * Provider : Resend API (Render compatible)
 * ============================================================
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Startup check
if (!process.env.RESEND_API_KEY) {
  console.error('📧 Mailer config error: RESEND_API_KEY not set in environment');
} else {
  console.log('📧 Mailer ready — yogkarthealthcare@gmail.com (via Resend)');
}

// ── Brand colours ─────────────────────────────────────────────────────────────
const TEAL   = '#0d9488';
const DARK   = '#1e293b';
const LIGHT  = '#f0fdfa';
const BORDER = '#ccfbf1';

// ── Shared layout wrapper ─────────────────────────────────────────────────────
const layout = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yogkart Healthcare</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:100%;">
        <tr>
          <td style="background:${TEAL};padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">🌿 Yogkart Healthcare</h1>
            <p  style="margin:4px 0 0;color:#ccfbf1;font-size:13px;">Wellness · Ayurveda · Nutrition</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;color:${DARK};font-size:15px;line-height:1.7;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:${LIGHT};border-top:1px solid ${BORDER};padding:20px 40px;text-align:center;color:#64748b;font-size:12px;">
            <p style="margin:0;">© ${new Date().getFullYear()} Yogkart Healthcare Private Limited</p>
            <p style="margin:4px 0 0;">Kanpur, Uttar Pradesh, India · <a href="mailto:yogkarthealthcare@gmail.com" style="color:${TEAL};text-decoration:none;">yogkarthealthcare@gmail.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── OTP box component ─────────────────────────────────────────────────────────
const otpBox = (otp) => `
  <div style="text-align:center;margin:28px 0;">
    <div style="display:inline-block;background:${LIGHT};border:2px solid ${TEAL};
                border-radius:12px;padding:18px 40px;">
      <span style="font-size:36px;font-weight:700;color:${TEAL};letter-spacing:10px;">${otp}</span>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:10px;">Valid for 10 minutes · Do not share with anyone</p>
  </div>`;

// ── Order items table ─────────────────────────────────────────────────────────
const orderItemsTable = (items = []) => {
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:center;">${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;">₹${Number(i.price).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr style="background:${LIGHT};">
          <th style="padding:10px;text-align:left;color:${TEAL};">Product</th>
          <th style="padding:10px;text-align:center;color:${TEAL};">Qty</th>
          <th style="padding:10px;text-align:right;color:${TEAL};">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

// ── Template map ──────────────────────────────────────────────────────────────
const TEMPLATES = {

  otp: ({ name = 'User', otp }) => ({
    subject: `${otp} — Your Yogkart Verification Code`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>Use the OTP below to verify your account:</p>
      ${otpBox(otp)}
      <p>If you did not request this, please ignore this email.</p>
    `),
  }),

  password_reset: ({ name = 'User', otp }) => ({
    subject: `${otp} — Yogkart Password Reset OTP`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Use the OTP below:</p>
      ${otpBox(otp)}
      <p style="color:#ef4444;font-size:13px;">⚠️ If this was not you, secure your account immediately.</p>
    `),
  }),

  welcome: ({ name = 'User' }) => ({
    subject: `Welcome to Yogkart Healthcare, ${name}! 🌿`,
    html: layout(`
      <p>Namaste <strong>${name}</strong>! 🙏</p>
      <p>Welcome to <strong>Yogkart Healthcare</strong> — your destination for authentic Ayurvedic wellness products.</p>
      <ul style="padding-left:20px;color:#475569;">
        <li>Browse 500+ Ayurvedic & wellness products</li>
        <li>100% natural & certified ingredients</li>
        <li>Fast delivery across India</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}"
           style="background:${TEAL};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
          Start Shopping →
        </a>
      </div>
    `),
  }),

  order_confirmation: ({ name = 'User', orderId, items = [], total, address = '' }) => ({
    subject: `Order Confirmed #${orderId} — Yogkart Healthcare`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>🎉 Your order has been placed successfully!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${LIGHT};border-radius:8px;padding:16px;">
        <tr><td><strong>Order ID:</strong></td><td style="color:${TEAL};font-weight:700;">#${orderId}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</td></tr>
        ${address ? `<tr><td style="vertical-align:top;padding-top:4px;"><strong>Deliver to:</strong></td><td>${address}</td></tr>` : ''}
      </table>
      ${items.length ? orderItemsTable(items) : ''}
      <p style="text-align:right;font-size:17px;">
        <strong>Total: <span style="color:${TEAL};">₹${Number(total).toLocaleString('en-IN')}</span></strong>
      </p>
      <p>We will notify you once your order is dispatched.</p>
    `),
  }),

  order_shipped: ({ name = 'User', orderId, trackingId = '', courier = '', estimatedDate = '' }) => ({
    subject: `Your Order #${orderId} Has Been Shipped 🚚`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>Great news! Your order <strong>#${orderId}</strong> is on its way.</p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="margin:16px 0;background:${LIGHT};border-radius:8px;padding:16px;font-size:14px;">
        ${trackingId   ? `<tr><td><strong>Tracking ID:</strong></td><td style="color:${TEAL};">${trackingId}</td></tr>` : ''}
        ${courier      ? `<tr><td><strong>Courier:</strong></td><td>${courier}</td></tr>` : ''}
        ${estimatedDate ? `<tr><td><strong>Estimated Delivery:</strong></td><td>${estimatedDate}</td></tr>` : ''}
      </table>
    `),
  }),

  order_delivered: ({ name = 'User', orderId }) => ({
    subject: `Order #${orderId} Delivered! Please Rate Your Experience ⭐`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>✅ Your order <strong>#${orderId}</strong> has been delivered successfully.</p>
      <p>We hope you are loving your Yogkart products! Please take a moment to share your feedback.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders"
           style="background:${TEAL};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
          Rate Your Order ⭐
        </a>
      </div>
    `),
  }),

  password_changed: ({ name = 'User' }) => ({
    subject: `Your Yogkart Password Was Changed`,
    html: layout(`
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account password was changed successfully on
         <strong>${new Date().toLocaleString('en-IN')}</strong>.</p>
      <p style="color:#ef4444;">If this was not you, contact us immediately at
         <a href="mailto:yogkarthealthcare@gmail.com" style="color:${TEAL};">yogkarthealthcare@gmail.com</a>
      </p>
    `),
  }),
};

// ── Main send function ────────────────────────────────────────────────────────
const sendEmail = async ({ type, to, data = {} }) => {
  const templateFn = TEMPLATES[type];
  if (!templateFn) throw new Error(`Unknown email type: "${type}". Valid: ${Object.keys(TEMPLATES).join(', ')}`);

  const { subject, html } = templateFn(data);

  const { data: result, error } = await resend.emails.send({
    from: 'Yogkart Healthcare <onboarding@resend.dev>',
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);

  console.log(`📧 [${type}] sent to ${to} — msgId: ${result.id}`);
  return { messageId: result.id };
};

module.exports = { sendEmail, TEMPLATES };