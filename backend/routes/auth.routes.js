const express = require('express');
const { register, login, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;