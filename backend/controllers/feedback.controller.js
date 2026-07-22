const feedbackService = require('../services/feedback.service');

// ─── GET EVENT FEEDBACKS ──────────────────────────────────────────────
exports.getEventFeedbacks = async (req, res) => {
  try {
    const {eventId} = req.params;
    const result = await feedbackService.getEventFeedbacks(eventId);
    res.status(200).json({ success: true, data: result.data, stats: result.stats });
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── CHECK ELIGIBILITY ──────────────────────────────────────────────
exports.checkEligibility = async (req, res) => {
  try {
    const {eventId} = req.params;
    const userId = req.user.UserID;

    await feedbackService.checkEligibility(eventId, userId);
    res.status(200).json({success: true, message: "Đủ điều kiện đánh giá."});
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return res.status(404).json({success: false, message: msg.split(': ')[1]});
    if (msg.startsWith('BAD_REQUEST')) return res.status(200).json({success: false, message: msg.split(': ')[1]});
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── CREATE FEEDBACK ──────────────────────────────────────────────
exports.createFeedback = async (req, res) => {
  try {
    const {eventId} = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment || "";
    const mediaURLs = req.files ? req.files.map(f => `/uploads/feedbacks/${f.filename}`) : [];
    const userId = req.user.UserID;

    await feedbackService.createFeedback(eventId, userId, rating, comment, mediaURLs);
    res.status(201).json({success: true, message: "Cảm ơn bạn đã đánh giá sự kiện!"});
  } catch (error) {
    if (error.number === 2627) return res.status(400).json({success: false, message: "Bạn đã đánh giá sự kiện này rồi."});
    
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return res.status(404).json({success: false, message: msg.split(': ')[1]});
    if (msg.startsWith('FORBIDDEN')) return res.status(403).json({success: false, message: msg.split(': ')[1]});
    
    console.error("CREATE FEEDBACK ERROR: ", error);
    res.status(500).json({success: false, message: error.message, error: error.message});
  }
};

// ─── UPDATE FEEDBACK ──────────────────────────────────────────────
exports.updateFeedback = async (req, res) => {
  try {
    const {eventId} = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment || "";
    const existingMedia = req.body.existingMedia;
    const newFiles = req.files;
    const userId = req.user.UserID;

    await feedbackService.updateFeedback(eventId, userId, rating, comment, existingMedia, newFiles);
    res.status(200).json({success: true, message: "Cập nhật đánh giá thành công!"});
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return res.status(404).json({success: false, message: msg.split(': ')[1]});

    console.error("UPDATE FEEDBACK ERROR: ", error);
    res.status(500).json({success: false, message: error.message, error: error.message});
  }
};

// ─── DELETE FEEDBACK ──────────────────────────────────────────────
exports.deleteFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const userId = req.user.UserID;
    
    await feedbackService.deleteFeedback(feedbackId, userId);
    res.status(200).json({success: true, message: "Đã xóa đánh giá thành công."});
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return res.status(404).json({success: false, message: msg.split(': ')[1]});
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── REPLY FEEDBACK ──────────────────────────────────────────────
exports.replyFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const {reply} = req.body;
    const userId = req.user.UserID;

    await feedbackService.replyFeedback(eventId, feedbackId, userId, reply);
    res.status(200).json({success: true, message: "Đã gửi câu trả lời."});
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('FORBIDDEN')) return res.status(403).json({success: false, message: msg.split(': ')[1]});
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── REPORT FEEDBACK ──────────────────────────────────────────────
exports.reportFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const {reason} = req.body;
    const userId = req.user.UserID;

    await feedbackService.reportFeedback(eventId, feedbackId, userId, reason);
    res.status(200).json({success: true, message: "Đã báo cáo đánh giá lên Admin."});
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('FORBIDDEN')) return res.status(403).json({success: false, message: msg.split(': ')[1]});
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── GET REPORTED FEEDBACKS ──────────────────────────────────────────────
exports.getReportedFeedbacks = async (req, res) => {
  try {
    const result = await feedbackService.getReportedFeedbacks();
    res.status(200).json({success: true, data: result});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

// ─── RESOLVE REPORT ──────────────────────────────────────────────
exports.resolveReport = async (req, res) => {
  try {
    const {feedbackId} = req.params;
    const {action} = req.body; // 'delete' or 'dismiss'
    
    await feedbackService.resolveReport(feedbackId, action);
    if (action === 'delete') {
      res.status(200).json({success: true, message: "Đã xóa đánh giá vi phạm."});
    } else {
      res.status(200).json({success: true, message: "Đã bỏ qua báo cáo."});
    }
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};
