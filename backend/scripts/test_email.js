require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function test() {
  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified successfully!');
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // send test to self
      subject: '✅ CodeGurukul Email Test',
      html: '<h2>Email system working!</h2><p>Gmail Nodemailer is configured correctly.</p>',
    });
    console.log('✅ Test email sent! MessageId:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('❌ Email test failed:', err.message);
    process.exit(1);
  }
}

test();
