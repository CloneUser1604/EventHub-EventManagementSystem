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
  getOrganizerStats
} = require('../controllers/admin.controller');

// Admin: Quản lý sự kiện
router.get('/events/pending', authenticate, authorize('Admin'), getPendingEvents);
router.post('/events/:eventId/approve', authenticate, authorize('Admin'), approveEvent);
router.post('/events/:eventId/reject', authenticate, authorize('Admin'), rejectEvent);
router.post('/events/:eventId/cancel', authenticate, authorize('Admin'), cancelEvent);

// Admin: Quản lý người dùng
router.get('/users', authenticate, authorize('Admin'), getAllUsers);
router.patch('/users/:userId/status', authenticate, authorize('Admin'), updateUserStatus);

// Admin: Tính năng nâng cao
router.post('/broadcast', authenticate, authorize('Admin'), broadcastNotification);
router.get('/organizers-stats', authenticate, authorize('Admin'), getOrganizerStats);

module.exports = router;
