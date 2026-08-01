const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  cancelEvent,
  getAllUsers,
  updateUserStatus,
  broadcastNotification,
  getOrganizerStats,
  getEventNotifications,
  revokeEventNotification 
} = require('../controllers/admin.controller');

// Admin: Quản lý sự kiện
// [Lấy danh sách sự kiện chờ duyệt] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/events/pending', authenticate, authorize('Admin'), getPendingEvents);
// [Duyệt sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/events/:eventId/approve', authenticate, authorize('Admin'), approveEvent);
// [Từ chối sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/events/:eventId/reject', authenticate, authorize('Admin'), rejectEvent);
// [Hủy sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/events/:eventId/cancel', authenticate, authorize('Admin'), cancelEvent);

// Admin: Quản lý thông báo sự kiện
// [Lấy thông báo sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/events/:eventId/notifications', authenticate, authorize('Admin'), getEventNotifications);
// [Thu hồi thông báo sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.delete('/events/:eventId/notifications', authenticate, authorize('Admin'), revokeEventNotification);

// Admin: Quản lý người dùng
// [Lấy tất cả người dùng] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/users', authenticate, authorize('Admin'), getAllUsers);
// [Cập nhật trạng thái người dùng] Từ Frontend -> gọi Middleware -> gọi Controller
router.patch('/users/:userId/status', authenticate, authorize('Admin'), updateUserStatus);

// Admin: Tính năng nâng cao
// [Gửi thông báo hệ thống] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/broadcast', authenticate, authorize('Admin'), broadcastNotification);
// [Lấy thống kê Ban tổ chức] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/organizers-stats', authenticate, authorize('Admin'), getOrganizerStats);

module.exports = router;