const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAvailableStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getAssignedStaff,
  assignStaff,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP,
  getEventParticipants
} = require('../controllers/staff.controller');

// Lấy danh sách Staff khả dụng (Admin)
router.get('/available', authenticate, authorize('Admin'), getAvailableStaff);

// CRUD Staff (Admin)
router.post('/', authenticate, authorize('Admin'), createStaff);
router.put('/:staffId', authenticate, authorize('Admin'), updateStaff);
router.delete('/:staffId', authenticate, authorize('Admin'), deleteStaff);

// Admin: Lấy danh sách Staff đã được gán cho sự kiện
router.get('/events/:eventId/assigned', authenticate, authorize('Admin', 'Organizer'), getAssignedStaff);

// Admin/Organizer/Staff/Participant (assigned staff): Lấy danh sách người tham gia
router.get('/events/:eventId/participants', authenticate, authorize('Admin', 'Organizer', 'Staff', 'Participant'), getEventParticipants);

// Admin: Gán Staff vào sự kiện trực tiếp
router.post('/events/:eventId/assign', authenticate, authorize('Admin'), assignStaff);

// Admin: Xóa quyền Staff
router.delete('/events/:eventId/staff/:staffId', authenticate, authorize('Admin'), revokeStaff);

// Staff: Sinh mã QR check-in
router.get('/session/:eventId', authenticate, authorize('Staff', 'Participant'), generateStaffSession);

// Participant: Nhập OTP tự check-in
router.post('/events/:eventId/participant-checkin', authenticate, participantCheckinWithOTP);

module.exports = router;
