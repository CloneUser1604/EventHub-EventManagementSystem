const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/auth.controller');

const { authenticate } = require('../middleware/auth');
const {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
} = require('../middleware/validators');

// ─── Rate Limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Quá nhiều yêu cầu gửi email, vui lòng thử lại sau.' },
});

// ─── Public Routes ─────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authLimiter, registerRules, validate, register);

// GET  /api/auth/verify-email?token=...
router.get('/verify-email', verifyEmail);

// POST /api/auth/resend-verification
router.post('/resend-verification', emailLimiter, resendVerification);

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, validate, login);

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshToken);

// POST /api/auth/forgot-password
router.post('/forgot-password', emailLimiter, forgotPasswordRules, validate, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);

// ─── Protected Routes ──────────────────────────────────────────

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// GET  /api/auth/me
router.get('/me', authenticate, getMe);

// PUT  /api/auth/change-password
router.put('/change-password', authenticate, changePasswordRules, validate, changePassword);

module.exports = router;
