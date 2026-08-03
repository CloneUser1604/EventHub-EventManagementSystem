const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const venueController = require('../controllers/venue.controller');

// [Lấy danh sách địa điểm] Từ Frontend (EventForm) -> gọi Controller: getAllVenues (public, không cần token)
router.get('/', venueController.getAllVenues);

// [Tạo địa điểm mới] Từ Frontend (Admin) -> authenticate, authorize(Admin) -> Controller: createVenue
router.post('/', authenticate, authorize('Admin'), venueController.createVenue);
// [Cập nhật địa điểm] Từ Frontend (Admin) -> authenticate -> Controller: updateVenue
router.put('/:id', authenticate, authorize('Admin'), venueController.updateVenue);
// [Xóa địa điểm] Từ Frontend (Admin) -> authenticate -> Controller: deleteVenue
router.delete('/:id', authenticate, authorize('Admin'), venueController.deleteVenue);

module.exports = router;
