const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, OTPRequest } = require('../models/postgres');
const emailService = require('../services/emailService');

// Generate Tokens
const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    let classId = null;
    if (user.role === 'student') {
      const { StudentProfile } = require('../models/postgres');
      const profile = await StudentProfile.findOne({ where: { user_id: user.id } });
      if (profile) classId = profile.class_id;
    }

    const tokens = generateTokens(user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_blind: user.is_blind,
        class_id: classId
      },
      ...tokens
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send 4-digit OTP to email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists, just return success
      return res.json({ msg: 'If the email exists, an OTP has been sent' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    await OTPRequest.create({
      user_id: user.id,
      otp_code: otpCode,
      expires_at: expiresAt
    });

    await emailService.sendOTP(email, otpCode);

    res.json({ msg: 'If the email exists, an OTP has been sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid OTP' });

    const otpRequest = await OTPRequest.findOne({
      where: {
        user_id: user.id,
        otp_code: otpCode,
        used: false
      },
      order: [['id', 'DESC']]
    });

    if (!otpRequest) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > otpRequest.expires_at) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    res.json({ msg: 'OTP Verified. Proceed to reset password', tempToken: otpRequest.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password after OTP verification
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, tempToken } = req.body;
    
    // Re-verify the OTP request to ensure security
    const otpRequest = await OTPRequest.findByPk(tempToken);
    const user = await User.findOne({ where: { email } });

    if (!otpRequest || !user || otpRequest.user_id !== user.id || otpRequest.used || new Date() > otpRequest.expires_at) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password_hash = hashedPassword;
    await user.save();

    // Mark OTP as used
    otpRequest.used = true;
    await otpRequest.save();

    // Send confirmation email with new credentials
    await emailService.sendEmail(
      user.email,
      'CodeGurukul — Password Updated Successfully',
      `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 22px;">✅ Password Updated</h2>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
          <p style="color: #374151; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #374151;">Your CodeGurukul account password has been updated successfully.</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #0369a1; font-weight: 600; margin: 0 0 10px 0;">🔑 Your New Credentials</p>
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="color:#6b7280; padding:5px 0; width:100px;">Email:</td><td style="color:#1e293b; font-weight:600;">${user.email}</td></tr>
              <tr><td style="color:#6b7280; padding:5px 0;">Password:</td><td style="color:#1e293b; font-weight:700; font-family:monospace; font-size:18px; letter-spacing:2px;">${newPassword}</td></tr>
            </table>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠️ If you did not make this change, contact your administrator immediately.</p>
          <div style="text-align:center; margin-top:20px;">
            <a href="http://localhost:5173/login" style="background:linear-gradient(135deg,#1e40af,#3b82f6); color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; display:inline-block;">Login Now →</a>
          </div>
        </div>
      </div>`
    );

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Get new access token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Invalid refresh token' });
      
      const payload = { id: decoded.id, role: decoded.role, email: decoded.email };
      const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      
      res.json({ accessToken: newAccessToken });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
