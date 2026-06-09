const express = require('express');
const router = express.Router();

const {
  createEvent,
  getMyEvents,
  getEventDetails,
  registerSpeakerForEvent,
} = require('../controllers/event.controller');

const { authenticate, authorize } = require('../middleware/auth');

// All event routes are protected and restricted to Organizers or Admins
router.use(authenticate);
router.use(authorize('Organizer', 'Admin'));

// POST /api/events - Create a mock/new event
router.post('/', createEvent);

// GET /api/events - List events managed by logged-in organizer
router.get('/', getMyEvents);

// GET /api/events/:eventId - View event details & speakers
router.get('/:eventId', getEventDetails);

// POST /api/events/:eventId/speakers - Register a speaker for a specific event
router.post('/:eventId/speakers', registerSpeakerForEvent);

module.exports = router;
