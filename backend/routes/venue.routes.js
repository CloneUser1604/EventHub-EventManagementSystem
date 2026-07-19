const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const venueController = require('../controllers/venue.controller');

// Tất cả đều được xem danh sách địa điểm
router.get('/', venueController.getAllVenues);

// Chỉ Admin mới được Thêm, Sửa, Xóa địa điểm
router.post('/', authenticate, authorize('Admin'), venueController.createVenue);
router.put('/:id', authenticate, authorize('Admin'), venueController.updateVenue);
router.delete('/:id', authenticate, authorize('Admin'), venueController.deleteVenue);

module.exports = router;
