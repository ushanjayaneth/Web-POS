const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const sendVerificationEmail = async (toEmail, firstName, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ShoppingLK" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your ShoppingLK account ✅',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#16a34a;">Hello ${firstName}! 👋</h2>
        <p>Thank you for registering at <strong>ShoppingLK</strong>.</p>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verifyUrl}" 
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px;">This link expires in 24 hours. If you did not register, please ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
        <p style="color:#aaa;font-size:11px;">ShoppingLK — Online Shopping in Sri Lanka</p>
      </div>
    `,
  });
};

const sendSellerStatusEmail = async (toEmail, firstName, status, reason = '') => {
  const subject = status === 'approved'
    ? 'Your Seller Application is Approved! 🎉'
    : 'Update on your ShoppingLK Seller Application';

  const bodyHtml = status === 'approved'
    ? `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#16a34a;">Congratulations ${firstName}! 🎉</h2>
        <p>Your seller application on <strong>ShoppingLK</strong> has been <strong>approved</strong>.</p>
        <p>You can now log in to your Seller Dashboard and start adding products.</p>
        <a href="${process.env.FRONTEND_URL}/seller/dashboard"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
          Go to Seller Dashboard
        </a>
        <p style="color:#aaa;font-size:11px;">ShoppingLK — Online Shopping in Sri Lanka</p>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#dc2626;">Dear ${firstName},</h2>
        <p>Unfortunately, your seller application on <strong>ShoppingLK</strong> has been <strong>rejected</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is a mistake, please contact us via WhatsApp: <strong>+94776338514</strong></p>
        <p style="color:#aaa;font-size:11px;">ShoppingLK — Online Shopping in Sri Lanka</p>
      </div>
    `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ShoppingLK" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html: bodyHtml,
  });
};

const sendOrderNotificationEmail = async (toEmail, firstName, orderNumber, items) => {
  const itemsHtml = items.map(i => `<li>${i.name} × ${i.quantity} — Rs. ${i.total}</li>`).join('');
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ShoppingLK" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `New Order Assigned to You — ${orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#16a34a;">New Order: ${orderNumber}</h2>
        <p>Dear ${firstName}, a customer has placed an order for your products.</p>
        <ul>${itemsHtml}</ul>
        <p>Please prepare the items for pickup/delivery. Admin will coordinate the delivery.</p>
        <a href="${process.env.FRONTEND_URL}/seller/orders"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
          View Orders
        </a>
        <p style="color:#aaa;font-size:11px;">ShoppingLK — Online Shopping in Sri Lanka</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendSellerStatusEmail, sendOrderNotificationEmail };
