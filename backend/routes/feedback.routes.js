const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");

// Lấy đúng tên hàm 'authenticate' từ file auth.js
const {authenticate, authorize} = require("../middleware/auth");
const {uploadFeedback} = require("../middleware/upload");

// Xem danh sách feedback (Ai cũng xem được)
// [Lấy danh sách feedback của sự kiện] Từ Frontend -> gọi Middleware -> gọi Controller
router.get("/events/:eventId/feedbacks", feedbackController.getEventFeedbacks);

// Kiểm tra điều kiện đánh giá
// [Kiểm tra điều kiện đánh giá] Từ Frontend -> gọi Middleware -> gọi Controller
router.get(
  "/events/:eventId/feedbacks/check-eligibility",
  authenticate,
  authorize('Participant'),
  feedbackController.checkEligibility,
);

// Viết feedback (Chỉ Participant mới được viết)
// [Viết feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.post(
  "/events/:eventId/feedbacks",
  authenticate,
  authorize('Participant'),
  uploadFeedback.array('media', 3),
  feedbackController.createFeedback,
);

// Cập nhật feedback (Chỉ Participant)
// [Cập nhật feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.put(
  "/events/:eventId/feedbacks",
  authenticate,
  authorize('Participant'),
  uploadFeedback.array('media', 3),
  feedbackController.updateFeedback,
);

// Xóa feedback (Chỉ Participant)
// [Xóa feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.delete(
  "/events/:eventId/feedbacks/:feedbackId",
  authenticate,
  authorize('Participant'),
  feedbackController.deleteFeedback,
);

// Organizer trả lời feedback (Chỉ Organizer của sự kiện mới được rep - service đã check thêm)
// [Trả lời feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.post(
  "/events/:eventId/feedbacks/:feedbackId/reply",
  authenticate,
  authorize('Organizer'),
  feedbackController.replyFeedback,
);

// Organizer báo cáo feedback
// [Báo cáo feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.post(
  "/events/:eventId/feedbacks/:feedbackId/report",
  authenticate,
  feedbackController.reportFeedback,
);

// Admin lấy danh sách feedback bị báo cáo
// [Lấy danh sách feedback bị báo cáo] Từ Frontend -> gọi Middleware -> gọi Controller
router.get(
  "/admin/reported-feedbacks",
  authenticate,
  authorize('Admin'),
  feedbackController.getReportedFeedbacks,
);

// Admin xử lý báo cáo
// [Xử lý báo cáo feedback] Từ Frontend -> gọi Middleware -> gọi Controller
router.post(
  "/admin/reported-feedbacks/:feedbackId/resolve",
  authenticate,
  authorize('Admin'),
  feedbackController.resolveReport,
);

module.exports = router;
