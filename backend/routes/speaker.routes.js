const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getPendingInvitation, firstTimeSetup, getInvitations, respondInvitation, getSpeakerEvents } = require('../controllers/speaker.controller');

// Lấy thông tin event invitation gần nhất (dùng cho First-time setup, không cần token)
router.get('/:userId/pending-invitation', getPendingInvitation);

// Cập nhật mật khẩu và phản hồi invitation (dùng cho First-time setup, không cần token)
router.post('/:userId/first-time-setup', firstTimeSetup);

// Lấy danh sách lời mời hiện có (dành cho Speaker đã login)
router.get('/invitations', authenticate, authorize('Speaker'), getInvitations);

// Xử lý phản hồi lời mời (Speaker)
router.post('/invitations/:eventId/respond', authenticate, authorize('Speaker'), respondInvitation);

// Lấy danh sách sự kiện mà diễn giả tham gia
router.get('/events', authenticate, authorize('Speaker'), getSpeakerEvents);

module.exports = router;
