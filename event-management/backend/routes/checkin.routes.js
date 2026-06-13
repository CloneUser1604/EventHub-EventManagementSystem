const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { verifyOTP } = require('../controllers/checkin.controller');

// Participant: Check-in bằng cách gửi mã OTP cùng token từ QR của Staff
router.post('/verify', authenticate, verifyOTP);

module.exports = router;
