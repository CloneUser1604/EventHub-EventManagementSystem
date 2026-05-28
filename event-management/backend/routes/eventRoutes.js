const express = require('express');
const router = express.Router();
const multer = require('multer'); // 1. Import multer

// 2. Cấu hình cấu trúc lưu trữ file tạm thời của multer (Lưu tạm vào bộ nhớ RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { protect, restrictTo } = require('../middleware/auth');
const { createEvent, getMyEvents, getApprovedEvents } = require('../controllers/eventController');

// Tuyến đường công khai cho trang chủ
router.get('/approved', getApprovedEvents);

// Tuyến đường tạo sự kiện kèm file chứng minh (Dùng upload.array để hứng trường 'verificationDocuments')
router.post(
  '/', 
  protect, 
  restrictTo('Organizer'), 
  upload.array('verificationDocuments'), // 3. Thêm middleware này đứng TRƯỚC hàm xử lý chính
  createEvent
);

router.get('/my-events', protect, restrictTo('Organizer'), getMyEvents);

module.exports = router;