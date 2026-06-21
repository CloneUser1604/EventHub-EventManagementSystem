const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { uploadOrgDocs } = require('../middleware/upload');
const {
  register, verifyEmail, resendVerification,
  login, refreshToken, logout, getMe,
  forgotPassword, resetPassword, changePassword,
  createSpeaker, approveSpeaker,
  approveOrganizer, getPendingOrganizers, getAllOrganizers, getPendingSpeakers, getAllSpeakers,
} = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, registerRules, loginRules, forgotPasswordRules, resetPasswordRules, changePasswordRules, createSpeakerRules } = require('../middleware/validators');

const authLimiter  = rateLimit({ windowMs: 15*60*1000, max: 10, message: { success:false, message:'Quá nhiều yêu cầu, thử lại sau 15 phút.' } });
const emailLimiter = rateLimit({ windowMs: 60*60*1000, max: 5,  message: { success:false, message:'Quá nhiều yêu cầu gửi email.' } });

// Public
router.post('/register', authLimiter, uploadOrgDocs.fields([{ name:'documents', maxCount:5 }]), registerRules, validate, register);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/login', loginRules, validate, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', emailLimiter, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, resetPassword);

// Protected
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// [CÔNG CỤ FIX DB]: Mở rộng sức chứa cho cột AvatarURL lên mức Vô hạn
router.get('/fix-avatar-column', async (req, res) => {
  try {
    const { getPool } = require('../config/db');
    await getPool().request().query('ALTER TABLE Users ALTER COLUMN AvatarURL NVARCHAR(MAX)');
    res.json({ success: true, message: 'Đã nâng cấp cột AvatarURL thành công! Giờ bạn có thể lưu ảnh Base64 thoải mái.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [BẢN VÁ NÂNG CAO]: Cập nhật hồ sơ với giới hạn dữ liệu tối đa và báo lỗi chi tiết
router.put('/me', authenticate, async (req, res) => {
  try {
    const { getPool, sql } = require('../config/db');
    const pool = getPool();
    
    // Quét cả định dạng chữ hoa và chữ thường từ Frontend gửi lên
    const { fullName, phone, avatarURL, FullName, Phone, AvatarURL } = req.body;
    const finalName = fullName || FullName || '';
    const finalPhone = phone || Phone || '';
    const finalAvatar = avatarURL || AvatarURL || '';

    // Lấy ID người dùng một cách an toàn
    const userId = req.user?.UserID || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Lỗi: Không tìm thấy ID người dùng trong Token.' });
    }

    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('FullName', sql.NVarChar(255), finalName)
      .input('Phone', sql.VarChar(50), finalPhone) // Tăng lên 50 để tránh lỗi tràn số điện thoại
      .input('AvatarURL', sql.NVarChar(sql.MAX), finalAvatar) // Đặt MAX để chứa link ảnh siêu dài
      .query('UPDATE Users SET FullName = @FullName, Phone = @Phone, AvatarURL = @AvatarURL WHERE UserID = @UserID');

    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('❌ Lỗi hệ thống tại Backend:', error);
    // Trả thẳng lỗi gốc của SQL về web để không phải đoán mò
    res.status(500).json({ success: false, message: `Lỗi Database: ${error.message}` });
  }
});

router.put('/change-password', authenticate, changePasswordRules, validate, changePassword);

// Organizer: tạo speaker trong event
router.post('/speakers', authenticate, authorize('Organizer'), createSpeakerRules, validate, createSpeaker);

// Admin: quản lý phê duyệt
router.get('/admin/pending-organizers', authenticate, authorize('Admin'), getPendingOrganizers);
router.get('/admin/all-organizers',     authenticate, authorize('Admin'), getAllOrganizers);
router.get('/admin/pending-speakers',   authenticate, authorize('Admin'), getPendingSpeakers);
router.get('/admin/all-speakers',       authenticate, authorize('Admin'), getAllSpeakers);
router.post('/admin/organizers/:profileId/review', authenticate, authorize('Admin'), approveOrganizer);
router.post('/admin/speakers/:speakerId/review',   authenticate, authorize('Admin'), approveSpeaker);

module.exports = router;