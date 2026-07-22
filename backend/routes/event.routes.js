const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const {
  getEvents, getEventById, createEvent, updateEvent, deleteEvent,
  submitForApproval, cancelEvent,
  getSessions, addSession, updateSession, deleteSession,
  unlockEventEdit, getCategories, getVenues, getDashboardStats,
} = require('../controllers/event.controller');
const { uploadEvent } = require('../middleware/upload');

// Public / optional-auth
router.get('/categories', getCategories);
router.get('/venues',     getVenues);
router.get('/',           optionalAuth, getEvents);
router.get('/:id',        optionalAuth, getEventById);

// Organizer: CRUD
router.post('/',   authenticate, authorize('Organizer','Admin'), uploadEvent.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'documents', maxCount: 5 }]), createEvent);
router.put('/:id', authenticate, authorize('Organizer','Admin'), uploadEvent.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'documents', maxCount: 5 }]), updateEvent);
router.delete('/:id', authenticate, authorize('Organizer','Admin'), deleteEvent);

// Organizer: submit for approval
router.post('/:id/submit',  authenticate, authorize('Organizer'), submitForApproval);
router.post('/:id/cancel',  authenticate, authorize('Organizer','Admin'), cancelEvent);

// router.post('/:id/notify-participants', authenticate, authorize('Organizer','Admin'), notifyParticipants);

// Admin: unlock edit
router.post('/:id/unlock-edit',  authenticate, authorize('Admin'), unlockEventEdit);

// Sessions
router.get('/:id/sessions',              optionalAuth, getSessions);
router.post('/:id/sessions',             authenticate, authorize('Organizer','Admin'), addSession);
router.put('/:id/sessions/:sessionId',   authenticate, authorize('Organizer','Admin'), updateSession);
router.delete('/:id/sessions/:sessionId',authenticate, authorize('Organizer','Admin'), deleteSession);

// Admin dashboard stats
router.get('/admin/stats', authenticate, authorize('Admin'), getDashboardStats);

module.exports = router;