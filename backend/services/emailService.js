// Email Service for University of Hyderabad Verification
require('dotenv').config();

async function sendVerificationEmail(email, otp) {
  console.log('\n======================================================');
  console.log(`📧 [UoH CAMPUS EMAIL DISPATCH]`);
  console.log(`📬 Recipient: ${email}`);
  console.log(`🔑 Verification OTP: ${otp}`);
  console.log(`⏳ Validity: 10 Minutes`);
  console.log(`======================================================\n`);

  // If external SMTP is configured, we can dispatch via nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"CampusShare @ UoH" <${process.env.SMTP_FROM || 'noreply@uohyd.ac.in'}>`,
        to: email,
        subject: `${otp} is your verification code for CampusShare`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 10px;">
            <h2 style="color: #4f46e5; margin-bottom: 10px;">University of Hyderabad</h2>
            <h3 style="margin-top: 0; color: #1e293b;">CampusShare Student Verification</h3>
            <p>Hello Student,</p>
            <p>Thank you for registering on CampusShare, the UoH student sharing platform. Please use the verification code below to complete your registration:</p>
            <div style="background: #eef2ff; color: #4338ca; font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `,
      });
      console.log('✅ Real email sent to', email);
    } catch (err) {
      console.warn('⚠️ SMTP send error (falling back to logged OTP):', err.message);
    }
  }

  return true;
}

module.exports = {
  sendVerificationEmail,
};
