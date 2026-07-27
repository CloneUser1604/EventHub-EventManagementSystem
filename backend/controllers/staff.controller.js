const staffService = require('../services/staff.service');

const getEventParticipants = async (req, res) => {
  try {
    const data = await staffService.getEventParticipants(parseInt(req.params.eventId), req.user.UserID, req.user.Role);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.message.startsWith('FORBIDDEN')) return res.status(403).json({ success: false, message: 'Forbidden' });
    console.error('Get participants error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người tham gia' });
  }
};

const getAvailableStaff = async (req, res) => {
  try {
    const { eventId } = req.query;
    const data = await staffService.getAvailableStaff(eventId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get available staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Staff' });
  }
};

const createStaff = async (req, res) => {
  try {
    await staffService.createStaff(req.body);
    return res.status(201).json({ success: true, message: 'Thêm tình nguyện viên thành công' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    return res.status(500).json({ success: false, message: 'Lỗi thêm tình nguyện viên' });
  }
};

const updateStaff = async (req, res) => {
  try {
    await staffService.updateStaff(parseInt(req.params.staffId), req.body);
    return res.status(200).json({ success: true, message: 'Cập nhật tình nguyện viên thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật tình nguyện viên' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    await staffService.deleteStaff(parseInt(req.params.staffId));
    return res.status(200).json({ success: true, message: 'Đã khóa tình nguyện viên' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xóa tình nguyện viên' });
  }
};

const getAssignedStaff = async (req, res) => {
  try {
    const data = await staffService.getAssignedStaff(parseInt(req.params.eventId));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get assigned staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Staff đã gán' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const data = await staffService.getMyEvents(req.user.UserID);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get my events error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sự kiện của bạn' });
  }
};

const assignStaff = async (req, res) => {
  try {
    const result = await staffService.assignStaff(parseInt(req.params.eventId), req.body.staffIds, req.user.UserID);
    if (result.isPartialSuccess) {
      return res.status(400).json({ success: false, message: result.message, errors: result.errors });
    }
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Assign staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gán Staff' });
  }
};

const generateStaffSession = async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const staffId = req.user.UserID;

    const hasAccess = await staffService.checkStaffAccess(eventId, staffId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là Staff của sự kiện này' });
    }

    const token = staffService.generateStaffSession(eventId, staffId);
    return res.status(200).json({ success: true, data: { qrToken: token } });
  } catch (error) {
    console.error('Generate staff session error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tạo phiên Staff' });
  }
};

const revokeStaff = async (req, res) => {
  try {
    await staffService.revokeStaff(parseInt(req.params.eventId), parseInt(req.params.staffId));
    return res.status(200).json({ success: true, message: 'Đã gỡ quyền Staff' });
  } catch (error) {
    console.error('Revoke staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa quyền Staff' });
  }
};

const participantCheckinWithOTP = async (req, res) => {
  try {
    await staffService.participantCheckinWithOTP(parseInt(req.params.eventId), req.user.UserID, req.body.staffId, req.body.otp);
    return res.status(200).json({ success: true, message: 'Tham gia sự kiện thành công!' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Participant Checkin error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý check-in' });
  }
};

module.exports = {
  getEventParticipants,
  getAvailableStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getAssignedStaff,
  getMyEvents,
  assignStaff,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP
};
