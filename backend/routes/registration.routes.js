const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { registerEvent, cancelRegistration, getMyRegistrations, getTicket, getNotifications, markNotificationRead } = require('../controllers/registration.controller');

// [Luồng Frontend: Đăng ký tham gia] -> [Route: POST /] -> [Middleware: auth, authorize] -> [Controller: registerEvent]
router.post('/',       authenticate, authorize('Participant', 'Speaker', 'Staff'), registerEvent);

// [Luồng Frontend: Hủy vé tham gia] -> [Route: DELETE /:id] -> [Middleware: auth, authorize] -> [Controller: cancelRegistration]
router.delete('/:id',  authenticate, authorize('Participant', 'Speaker', 'Staff'), cancelRegistration);
router.get('/my',      authenticate, authorize('Participant', 'Speaker', 'Staff'), getMyRegistrations);
router.get('/:id/ticket', authenticate, getTicket);
router.get('/notifications',   authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);

module.exports = router;
