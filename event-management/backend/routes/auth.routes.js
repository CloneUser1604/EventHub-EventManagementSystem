const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { uploadOrgDocs } = require('../middleware/upload');
const {
  register, verifyEmail, resendVerification,
  login, refreshToken, logout, getMe,
  forgotPassword, resetPassword, changePassword,
  createSpeaker, approveSpeaker,
  approveOrganizer, getPendingOrganizers, getAllOrganizers, getPendingSpeakers,
} = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, registerRules, loginRules, forgotPasswordRules, resetPasswordRules, changePasswordRules, createSpeakerRules } = require('../middleware/validators');

const authLimiter  = rateLimit({ windowMs: 15*60*1000, max: 10, message: { success:false, message:'Quá nhiều yêu cầu, thử lại sau 15 phút.' } });
const emailLimiter = rateLimit({ windowMs: 60*60*1000, max: 5,  message: { success:false, message:'Quá nhiều yêu cầu gửi email.' } });

// Public
router.post('/register', authLimiter, uploadOrgDocs.fields([{ name:'documents', maxCount:5 }]), registerRules, validate, register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', emailLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);

// Protected
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePasswordRules, validate, changePassword);

// Organizer: tạo speaker trong event
router.post('/speakers', authenticate, authorize('Organizer'), createSpeakerRules, validate, createSpeaker);

// Admin: quản lý phê duyệt
router.get('/admin/pending-organizers', authenticate, authorize('Admin'), getPendingOrganizers);
router.get('/admin/all-organizers',     authenticate, authorize('Admin'), getAllOrganizers);
router.get('/admin/pending-speakers',   authenticate, authorize('Admin'), getPendingSpeakers);
router.post('/admin/organizers/:profileId/review', authenticate, authorize('Admin'), approveOrganizer);
router.post('/admin/speakers/:speakerId/review',   authenticate, authorize('Admin'), approveSpeaker);

module.exports = router;
