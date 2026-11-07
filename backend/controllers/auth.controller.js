const User = require('../models/User.model');
const OTP = require('../models/OTP.model');
const { generateToken } = require('../config/jwt.config');
const { sendSMS, normalizePhone } = require('../utils/smsService');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password, role });
    await user.save();

    const token = generateToken(user._id);
    
    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions || [],
        profilePhoto: user.profilePhoto,
        phone: user.phone,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    
    res.json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions || [],
        profilePhoto: user.profilePhoto,
        phone: user.phone,
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions || [],
      profilePhoto: req.user.profilePhoto,
      phone: req.user.phone,
      mustChangePassword: !!req.user.mustChangePassword
    }
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phone);

    // Find user by any variant of this phone number
    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: phone },
        { phone: '0' + normalizedPhone.slice(3) } // e.g. 09XXXXXXXX variant
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this phone number' });
    }

    // Clear any previous OTPs for this phone
    await OTP.deleteMany({ phone: normalizedPhone });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      phone: normalizedPhone,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Mask the phone for display (e.g. 2519****567)
    const masked = normalizedPhone.length >= 7 
      ? normalizedPhone.slice(0, 4) + '****' + normalizedPhone.slice(-3)
      : normalizedPhone;

    // Send OTP via SMS Ethiopia
    const userName = (user.name || '').trim();
    const greeting = userName ? `Dear ${userName}, ` : 'Dear User, ';
    const smsText = `${greeting}your Bluelight Academy password reset OTP is: ${otp}. It expires in 10 minutes. Do not share this code.`;
    const smsResult = await sendSMS(normalizedPhone, smsText);

    if (!smsResult.success) {
      // Roll back OTP record so it cannot be used
      await OTP.deleteOne({ phone: normalizedPhone, otp });
      return res.status(400).json({
        message: `Failed to send SMS to ${masked}: ${smsResult.error || 'SMS delivery failed'}`,
        detail: smsResult.error
      });
    }

    res.json({
      message: `OTP sent successfully to ${masked}`,
      phone: normalizedPhone,
      maskedPhone: masked
    });
  } catch (error) {
    console.error('[forgotPassword]', error);
    res.status(500).json({ message: error.message || 'Server error. Please try again later.' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const normalizedPhone = normalizePhone(phone);

    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      otp,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    otpRecord.used = true;
    await otpRecord.save();

    res.json({ message: 'OTP verified successfully', phone: normalizedPhone });
  } catch (error) {
    console.error('[verifyOTP]', error);
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ message: 'Phone, OTP, and new password are required' });
    }

    const normalizedPhone = normalizePhone(phone);

    const otpRecord = await OTP.findOne({
      phone: normalizedPhone,
      otp,
      used: true,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Find user by phone (try all variants)
    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: phone },
        { phone: '0' + normalizedPhone.slice(3) }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('[resetPassword]', error);
    res.status(500).json({ message: error.message });
  }
};

const forceChangePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    user.plainPassword = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      message: 'Password changed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        profilePhoto: user.profilePhoto,
        phone: user.phone,
        mustChangePassword: false
      }
    });
  } catch (error) {
    console.error('[forceChangePassword]', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

module.exports = { register, login, getMe, forgotPassword, verifyOTP, resetPassword, forceChangePassword };