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

router.get('/fix-avatar-column', async (req, res) => {
  try {
    const { getPool } = require('../config/db');
    await getPool().request().query('ALTER TABLE Users ALTER COLUMN AvatarURL NVARCHAR(MAX)');
    res.json({ success: true, message: 'Đã nâng cấp cột AvatarURL thành công!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// [BẢN VÁ NÂNG CAO]: Mở cổng đón 2 loại file cùng lúc (Documents và Avatar)
router.put('/me', authenticate, uploadOrgDocs.fields([{ name:'documents', maxCount:5 }, { name:'avatar', maxCount:1 }]), async (req, res) => {
  try {
    const { getPool, sql } = require('../config/db');
    const pool = getPool();
    
    // 1. Nhận dữ liệu chữ
    const finalName = req.body.fullName || req.body.FullName || '';
    const finalPhone = req.body.phone || req.body.Phone || '';
    
    // 2. Xử lý Ảnh đại diện (Ưu tiên lấy file thật, nếu không có lấy URL)
    let finalAvatar = req.body.avatarURL || req.body.AvatarURL || '';
    if (req.files && req.files['avatar'] && req.files['avatar'].length > 0) {
      finalAvatar = req.files['avatar'][0].filename; // Trích xuất tên file
    }

    const userId = req.user?.UserID || req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Lỗi: Không tìm thấy ID người dùng.' });
    }

    // 3. Cập nhật thông tin User
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('FullName', sql.NVarChar(255), finalName)
      .input('Phone', sql.VarChar(50), finalPhone)
      .input('AvatarURL', sql.NVarChar(sql.MAX), finalAvatar)
      .query('UPDATE Users SET FullName = @FullName, Phone = @Phone, AvatarURL = @AvatarURL WHERE UserID = @UserID');

    // 4. Cập nhật tài liệu Organizer (Nếu có)
    if (req.files && req.files['documents'] && req.files['documents'].length > 0) {
      const paths = req.files['documents'].map(f => f.filename);
      const docJson = JSON.stringify(paths);

      await pool.request()
        .input('UserID', sql.Int, userId)
        .input('Docs', sql.NVarChar(sql.MAX), docJson)
        .query(`
          UPDATE OrganizerProfiles 
          SET DocumentURL = @Docs, ApprovalStatus = 'Pending', UpdatedAt = GETDATE() 
          WHERE UserID = @UserID
        `);
    }

    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('❌ Lỗi hệ thống tại Backend:', error);
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