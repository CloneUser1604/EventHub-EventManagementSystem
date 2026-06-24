const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"EMS System" <noreply@ems.edu.vn>',
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

// ─── Email Templates ─────────────────────────────────────────

const sendVerificationEmail = async (email, fullName, token) => {
  const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: '✅ Xác thực tài khoản EMS',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">🎓 EMS</h1>
            <p style="color: #6b7280; margin: 8px 0 0;">Event Management System</p>
          </div>
          <h2 style="color: #1a1a2e; font-size: 22px;">Xin chào, ${fullName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản EMS. Vui lòng nhấn nút bên dưới để xác thực địa chỉ email của bạn.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyURL}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px; 
                      display: inline-block;">
              Xác thực Email
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} EMS - Event Management System
          </p>
        </div>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, fullName, token) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: '🔐 Đặt lại mật khẩu EMS',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">🎓 EMS</h1>
          </div>
          <h2 style="color: #1a1a2e; font-size: 22px;">Xin chào, ${fullName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetURL}" 
               style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                      color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px; 
                      display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Liên kết có hiệu lực trong <strong>1 giờ</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.
          </p>
        </div>
      </div>
    `,
  });
};

const sendWelcomeEmail = async (email, fullName) => {
  return sendEmail({
    to: email,
    subject: '🎉 Chào mừng đến với EMS!',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px;">🎓</div>
            <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">Chào mừng đến EMS!</h1>
          </div>
          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
            Xin chào <strong>${fullName}</strong>, tài khoản của bạn đã được xác thực thành công!
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Bạn có thể bắt đầu khám phá và đăng ký tham gia các sự kiện thú vị tại trường.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL}/events" 
               style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); 
                      color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px; 
                      display: inline-block;">
              Khám phá sự kiện
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
