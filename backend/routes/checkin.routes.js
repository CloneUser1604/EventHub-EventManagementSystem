const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { verifyOTP } = require('../controllers/checkin.controller');

// [Xác thực OTP Check-in] Route POST /checkin/verify -> Middleware authenticate -> Controller này
router.post('/verify', authenticate, verifyOTP);

module.exports = router;
