const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { registerEvent, cancelRegistration, getMyRegistrations, getTicket, getNotifications, markNotificationRead } = require('../controllers/registration.controller');

router.post('/',       authenticate, authorize('Participant'), registerEvent);
router.delete('/:id',  authenticate, authorize('Participant'), cancelRegistration);
router.get('/my',      authenticate, authorize('Participant'), getMyRegistrations);
router.get('/:id/ticket', authenticate, getTicket);
router.get('/notifications',   authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);

module.exports = router;
