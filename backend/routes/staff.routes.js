const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAvailableStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getAssignedStaff,
  getMyEvents,
  assignStaff,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP,
  getEventParticipants
} = require('../controllers/staff.controller');

// [Lấy danh sách sự kiện được gán] Từ Frontend (StaffDashboard) -> authenticate, authorize(Staff) -> Controller: getMyEvents
router.get('/my-events', authenticate, authorize('Staff'), getMyEvents);

// [Lấy danh sách Staff khả dụng] Từ Frontend (Admin) -> authenticate, authorize(Admin) -> Controller: getAvailableStaff
router.get('/available', authenticate, authorize('Admin'), getAvailableStaff);

// [Tạo tài khoản Staff] Từ Frontend (Admin) -> authenticate -> Controller: createStaff
router.post('/', authenticate, authorize('Admin'), createStaff);
// [Cập nhật Staff] Từ Frontend (Admin) -> authenticate -> Controller: updateStaff
router.put('/:staffId', authenticate, authorize('Admin'), updateStaff);
// [Xóa Staff] Từ Frontend (Admin) -> authenticate -> Controller: deleteStaff
router.delete('/:staffId', authenticate, authorize('Admin'), deleteStaff);

// [Lấy danh sách Staff đã gán cho sự kiện] Từ Frontend -> authenticate -> Controller: getAssignedStaff
router.get('/events/:eventId/assigned', authenticate, authorize('Admin', 'Organizer'), getAssignedStaff);

// [Lấy danh sách người tham gia sự kiện] Từ Frontend -> authenticate -> Controller: getEventParticipants
router.get('/events/:eventId/participants', authenticate, authorize('Admin', 'Organizer', 'Staff', 'Participant'), getEventParticipants);

// [Gán Staff vào sự kiện] Từ Frontend (Admin) -> authenticate -> Controller: assignStaff
router.post('/events/:eventId/assign', authenticate, authorize('Admin'), assignStaff);

// [Xóa quyền Staff khỏi sự kiện] Từ Frontend (Admin) -> authenticate -> Controller: revokeStaff
router.delete('/events/:eventId/staff/:staffId', authenticate, authorize('Admin'), revokeStaff);

// [Sinh mã QR check-in phiên] Từ Frontend (Staff) -> authenticate -> Controller: generateStaffSession
router.get('/session/:eventId', authenticate, authorize('Staff', 'Participant'), generateStaffSession);

// [Participant tự check-in bằng OTP] Từ Frontend -> authenticate -> Controller: participantCheckinWithOTP
router.post('/events/:eventId/participant-checkin', authenticate, participantCheckinWithOTP);

module.exports = router;
