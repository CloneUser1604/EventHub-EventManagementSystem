const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");

// Lấy đúng tên hàm 'authenticate' từ file auth.js
const {authenticate} = require("../middleware/auth");
const {uploadFeedback} = require("../middleware/upload");

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
  uploadFeedback.array('media', 3),
  feedbackController.createFeedback,
);

// Cập nhật feedback
router.put(
  "/events/:eventId/feedbacks",
  authenticate,
  uploadFeedback.array('media', 3),
  feedbackController.updateFeedback,
);

// Xóa feedback (Participant)
router.delete(
  "/events/:eventId/feedbacks/:feedbackId",
  authenticate,
  feedbackController.deleteFeedback,
);

// Organizer trả lời feedback
router.post(
  "/events/:eventId/feedbacks/:feedbackId/reply",
  authenticate,
  feedbackController.replyFeedback,
);

// Organizer báo cáo feedback
router.post(
  "/events/:eventId/feedbacks/:feedbackId/report",
  authenticate,
  feedbackController.reportFeedback,
);

// Admin lấy danh sách feedback bị báo cáo
router.get(
  "/admin/reported-feedbacks",
  authenticate, // should ideally be authorize('Admin') but auth middleware might be needed
  feedbackController.getReportedFeedbacks,
);

// Admin xử lý báo cáo
router.post(
  "/admin/reported-feedbacks/:feedbackId/resolve",
  authenticate,
  feedbackController.resolveReport,
);

module.exports = router;
