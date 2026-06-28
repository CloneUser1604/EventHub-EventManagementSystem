const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");

// Lấy đúng tên hàm 'authenticate' từ file auth.js
const {authenticate} = require("../middleware/auth");

// Xem danh sách feedback (Ai cũng xem được)
router.get("/events/:eventId/feedbacks", feedbackController.getEventFeedbacks);

// Kiểm tra điều kiện đánh giá
router.get(
  "/events/:eventId/feedbacks/check-eligibility",
  authenticate,
  feedbackController.checkEligibility,
);

// Viết feedback (Bắt buộc phải đăng nhập -> dùng 'authenticate')
router.post(
  "/events/:eventId/feedbacks",
  authenticate,
  feedbackController.createFeedback,
);

// Cập nhật feedback
router.put(
  "/events/:eventId/feedbacks",
  authenticate,
  feedbackController.updateFeedback,
);

module.exports = router;
