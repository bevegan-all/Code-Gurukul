const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail transporter using App Password (no domain verification needed)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class EmailService {
  async sendEmail(to, subject, htmlContent) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"CodeGurukul" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: htmlContent,
      });
      console.log(`Email sent to ${to}. MessageId: ${info.messageId}`);
      return { success: true, data: info };
    } catch (error) {
      console.error('Error sending email via Nodemailer:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(email, otpCode) {
    return this.sendEmail(
      email,
      'Your CodeGurukul OTP',
      `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 22px;">Password Reset OTP</h2>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #374151; font-size: 15px;">Use the code below to reset your password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #1e40af; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>10 minutes</strong>. If you did not request this, ignore this email.</p>
        </div>
      </div>`
    );
  }

  async sendWelcomeEmail(email, name, role, defaultPassword, rollNo = null) {
    const roleLabel = role === 'teacher' ? 'Teacher' : 'Student';
    return this.sendEmail(
      email,
      `Welcome to CodeGurukul — Your ${roleLabel} Account is Ready! 🎓`,
      `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to CodeGurukul</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 15px;">Your ${roleLabel.toLowerCase()} account has been created</p>
        </div>
        <div style="background: white; padding: 36px 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #374151; font-size: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #6b7280;">Your ${roleLabel.toLowerCase()} account on the CodeGurukul Lab Management Portal has been set up by your administrator.</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #0369a1; font-weight: 600; margin: 0 0 12px 0; font-size: 15px;">🔑 Your Login Credentials</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; padding: 6px 0; width: 120px;">Email:</td>
                <td style="color: #1e293b; font-weight: 600;">${email}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; padding: 6px 0;">Password:</td>
                <td style="color: #1e293b; font-weight: 700; font-family: monospace; font-size: 18px; letter-spacing: 2px;">${defaultPassword}</td>
              </tr>
              ${rollNo ? `<tr><td style="color: #6b7280; padding: 6px 0;">Roll No:</td><td style="color: #1e293b; font-weight: 600;">${rollNo}</td></tr>` : ''}
            </table>
          </div>
          <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="color: #854d0e; margin: 0; font-size: 14px;">⚠️ Please <strong>change your password</strong> immediately after your first login for security.</p>
          </div>
          <div style="text-align: center;">
            <a href="http://localhost:5173/login" style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Login to CodeGurukul →</a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">This is an automated message from CodeGurukul. Do not reply.</p>
        </div>
      </div>`
    );
  }
}

module.exports = new EmailService();
