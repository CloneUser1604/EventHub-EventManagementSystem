const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { getPendingEvents, approveEvent, rejectEvent } = require('../controllers/adminController');

router.get('/events/pending', protect, restrictTo('Admin'), getPendingEvents);
router.put('/events/:id/approve', protect, restrictTo('Admin'), approveEvent);
router.put('/events/:id/reject', protect, restrictTo('Admin'), rejectEvent);

module.exports = router;