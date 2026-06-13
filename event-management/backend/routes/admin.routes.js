const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getAllUsers,
  updateUserStatus
} = require('../controllers/admin.controller');

// Admin: Quản lý sự kiện
router.get('/events/pending', authenticate, authorize('Admin'), getPendingEvents);
router.post('/events/:eventId/approve', authenticate, authorize('Admin'), approveEvent);
router.post('/events/:eventId/reject', authenticate, authorize('Admin'), rejectEvent);

// Admin: Quản lý người dùng
router.get('/users', authenticate, authorize('Admin'), getAllUsers);
router.patch('/users/:userId/status', authenticate, authorize('Admin'), updateUserStatus);

module.exports = router;
