const feedbackRepository = require('../repositories/feedback.repository');

class FeedbackService {
  // ─── GET EVENT FEEDBACKS ──────────────────────────────────────────────
// [Service: Lấy danh sách feedback của sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
async getEventFeedbacks(eventId) {
    const data = await feedbackRepository.getFeedbacksByEventId(eventId);
    const stats = await feedbackRepository.getEventFeedbackStats(eventId);
    return { data, stats };
  }

// [Service: Kiểm tra điều kiện đánh giá] Nhận từ Controller -> Xử lý logic -> gọi Repository
    async checkEligibility(eventId, userId) {
    const eventInfo = await feedbackRepository.checkEventEligibility(eventId, userId);
    if (!eventInfo) throw new Error('NOT_FOUND: Sự kiện không tồn tại.');
    if (new Date(eventInfo.EndDate) > new Date()) throw new Error('BAD_REQUEST: Sự kiện chưa kết thúc, chưa thể đánh giá.');
    if (eventInfo.RegistrationStatus !== "Registered") throw new Error('BAD_REQUEST: Bạn phải đăng ký tham gia sự kiện mới được quyền đánh giá.');
    if (!eventInfo.AttendanceID) throw new Error('BAD_REQUEST: Bạn phải check-in tham gia sự kiện thành công thì mới được quyền đánh giá.');
    
    const existingFeedback = await feedbackRepository.checkIfFeedbackExists(eventId, userId);
    if (existingFeedback) {
      if (existingFeedback.Status === 'Deleted') {
        throw new Error('BAD_REQUEST: Đánh giá của bạn đã bị xoá do vi phạm. Bạn không thể đánh giá lại sự kiện này.');
      } else {
        throw new Error('BAD_REQUEST: Bạn đã đánh giá sự kiện này rồi.');
      }
    }
  }

  // ─── CREATE FEEDBACK ──────────────────────────────────────────────
// [Service: Viết feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async createFeedback(eventId, userId, rating, comment, mediaURLs) {
    const eventInfo = await feedbackRepository.checkEventEligibility(eventId, userId);
    if (!eventInfo) throw new Error('NOT_FOUND: Sự kiện không tồn tại.');
    if (new Date(eventInfo.EndDate) > new Date()) throw new Error('FORBIDDEN: Sự kiện chưa kết thúc, chưa thể đánh giá.');
    if (eventInfo.RegistrationStatus !== "Registered") throw new Error('FORBIDDEN: Bạn phải đăng ký tham gia sự kiện mới được quyền đánh giá.');
    if (!eventInfo.AttendanceID) throw new Error('FORBIDDEN: Bạn phải check-in tham gia sự kiện thành công thì mới được quyền đánh giá.');
    
    const existingFeedback = await feedbackRepository.checkIfFeedbackExists(eventId, userId);
    if (existingFeedback) {
      if (existingFeedback.Status === 'Deleted') {
        throw new Error('FORBIDDEN: Đánh giá của bạn đã bị xoá do vi phạm. Bạn không thể đánh giá lại sự kiện này.');
      } else {
        throw new Error('FORBIDDEN: Bạn đã đánh giá sự kiện này rồi.');
      }
    }

    await feedbackRepository.createFeedback(eventId, userId, rating, comment, mediaURLs);
  }

  // ─── UPDATE FEEDBACK ──────────────────────────────────────────────
// [Service: Cập nhật feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async updateFeedback(eventId, userId, rating, comment, existingMedia, newFiles) {
    let mediaURLs = [];
    if (existingMedia) {
      try {
        mediaURLs = JSON.parse(existingMedia);
      } catch (e) {
        if (typeof existingMedia === 'string') {
          mediaURLs = [existingMedia];
        } else if (Array.isArray(existingMedia)) {
          mediaURLs = existingMedia;
        }
      }
    }
    
    if (newFiles && newFiles.length > 0) {
      const newMedia = newFiles.map(f => `/uploads/feedbacks/${f.filename}`);
      mediaURLs = [...mediaURLs, ...newMedia];
    }
    
    const existingFeedback = await feedbackRepository.checkIfFeedbackExists(eventId, userId);
    if (!existingFeedback) throw new Error('NOT_FOUND: Bạn chưa đánh giá sự kiện này.');
    if (existingFeedback.Status === 'Deleted') throw new Error('FORBIDDEN: Đánh giá của bạn đã bị xoá do vi phạm. Không thể chỉnh sửa.');

    await feedbackRepository.updateFeedback(eventId, userId, rating, comment, mediaURLs);
  }

  // ─── DELETE FEEDBACK ──────────────────────────────────────────────
// [Service: Xóa feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async deleteFeedback(feedbackId, userId) {
    const deleted = await feedbackRepository.deleteFeedback(feedbackId, userId);
    if (!deleted) throw new Error('NOT_FOUND: Không tìm thấy đánh giá hoặc bạn không có quyền xóa.');
  }

  // ─── REPLY FEEDBACK ──────────────────────────────────────────────
// [Service: Trả lời feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async replyFeedback(eventId, feedbackId, userId, reply) {
    const isOrganizer = await feedbackRepository.checkIsOrganizer(eventId, userId);
    if (!isOrganizer) throw new Error('FORBIDDEN: Bạn không có quyền trả lời đánh giá này.');
    await feedbackRepository.replyFeedback(feedbackId, reply);
  }

  // ─── REPORT FEEDBACK ──────────────────────────────────────────────
// [Service: Báo cáo feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async reportFeedback(eventId, feedbackId, userId, reason) {
    const isOrganizer = await feedbackRepository.checkIsOrganizer(eventId, userId);
    if (!isOrganizer) throw new Error('FORBIDDEN: Bạn không có quyền thao tác.');
    await feedbackRepository.reportFeedback(feedbackId, reason, userId);
  }

  // ─── GET REPORTED FEEDBACKS ──────────────────────────────────────────────
// [Service: Lấy danh sách feedback bị báo cáo] Nhận từ Controller -> Xử lý logic -> gọi Repository
async getReportedFeedbacks() {
    return await feedbackRepository.getReportedFeedbacks();
  }

  // ─── RESOLVE REPORT ──────────────────────────────────────────────
// [Service: Xử lý báo cáo feedback] Nhận từ Controller -> Xử lý logic -> gọi Repository
async resolveReport(feedbackId, action) {
    await feedbackRepository.resolveReport(feedbackId, action);
  }
}

module.exports = new FeedbackService();
