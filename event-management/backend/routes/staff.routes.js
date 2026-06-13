const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getEventParticipants,
  inviteStaff,
  respondToInvitation,
  getMyInvitations,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP
} = require('../controllers/staff.controller');

// Organizer or Staff: Lấy danh sách những người đã đăng ký sự kiện
router.get('/events/:eventId/participants', authenticate, getEventParticipants);

// Organizer: Mời Participant làm Staff
router.post('/events/:eventId/invite', authenticate, authorize('Organizer'), inviteStaff);

// Participant: Xem các lời mời làm Staff
router.get('/invitations', authenticate, getMyInvitations);

// Participant: Phản hồi lời mời (Chấp nhận / Từ chối)
router.post('/events/:eventId/respond', authenticate, respondToInvitation);

// Staff (Participant đã chấp nhận): Sinh mã QR check-in
router.get('/session/:eventId', authenticate, generateStaffSession);

// Organizer: Xóa quyền Staff
router.delete('/events/:eventId/staff/:staffId', authenticate, authorize('Organizer'), revokeStaff);

// Participant: Nhập OTP tự check-in
router.post('/events/:eventId/participant-checkin', authenticate, participantCheckinWithOTP);

module.exports = router;
