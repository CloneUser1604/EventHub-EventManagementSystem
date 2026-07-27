const {
  successResponse, createdResponse, errorResponse,
  notFoundResponse, forbiddenResponse, conflictResponse,
} = require('../utils/response');
const eventService = require('../services/event.service');

const getEvents = async (req, res) => {
  try {
    const result = await eventService.getEvents(req.query, req.user);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách sự kiện thất bại: ' + error.message);
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.getEventById(parseInt(id), req.user);
    return successResponse(res, result);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    return errorResponse(res, 'Lấy thông tin sự kiện thất bại');
  }
};

const createEvent = async (req, res) => {
  try {
    const result = await eventService.createEvent(req.body, req.user, req.files);
    return createdResponse(res, result, 'Tạo sự kiện thành công');
  } catch (error) {
    if (error.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return res.status(500).json({ success: false, message: 'Tạo sự kiện thất bại: ' + error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.updateEvent(parseInt(id), req.body, req.user, req.files);
    return successResponse(res, result, result.message);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return res.status(500).json({ success: false, message: 'Cập nhật sự kiện thất bại: ' + error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await eventService.deleteEvent(parseInt(id), req.user);
    return successResponse(res, null, 'Xoá sự kiện thành công');
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Xoá sự kiện thất bại');
  }
};

const submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    await eventService.submitForApproval(parseInt(id), req.user);
    return successResponse(res, null, 'Đã gửi yêu cầu duyệt sự kiện');
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return conflictResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Gửi duyệt thất bại');
  }
};

const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await eventService.cancelEvent(parseInt(id), req.body.reason, req.user);
    return successResponse(res, null, 'Đã huỷ sự kiện');
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return conflictResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Huỷ sự kiện thất bại');
  }
};

const getSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.getSessions(parseInt(id));
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy sessions thất bại'); }
};

const addSession = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.addSession(parseInt(id), req.body, req.user);
    return createdResponse(res, result, 'Thêm phiên thành công');
  } catch (e) {
    if (e.message.startsWith('NOT_FOUND')) return notFoundResponse(res, e.message.split(': ')[1]);
    if (e.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, e.message.split(': ')[1]);
    return errorResponse(res, 'Thêm phiên thất bại');
  }
};

const updateSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    await eventService.updateSession(parseInt(id), parseInt(sessionId), req.body, req.user);
    return successResponse(res, null, 'Cập nhật phiên thành công');
  } catch (e) {
    if (e.message.startsWith('NOT_FOUND')) return notFoundResponse(res, e.message.split(': ')[1]);
    if (e.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, e.message.split(': ')[1]);
    return errorResponse(res, 'Cập nhật phiên thất bại');
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    await eventService.deleteSession(parseInt(id), parseInt(sessionId), req.user);
    return successResponse(res, null, 'Xoá phiên thành công');
  } catch (e) {
    if (e.message.startsWith('NOT_FOUND')) return notFoundResponse(res, e.message.split(': ')[1]);
    if (e.message.startsWith('FORBIDDEN')) return forbiddenResponse(res, e.message.split(': ')[1]);
    return errorResponse(res, 'Xoá phiên thất bại');
  }
};

const unlockEventEdit = async (req, res) => {
  try {
    const { id } = req.params;
    await eventService.unlockEventEdit(parseInt(id));
    return successResponse(res, null, 'Đã mở khoá chỉnh sửa sự kiện');
  } catch (e) { return errorResponse(res, 'Mở khoá thất bại'); }
};

const getCategories = async (req, res) => {
  try {
    const result = await eventService.getCategories();
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy danh mục thất bại'); }
};

const getVenues = async (req, res) => {
  try {
    const result = await eventService.getVenues();
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy địa điểm thất bại'); }
};

const getDashboardStats = async (req, res) => {
  try {
    const result = await eventService.getDashboardStats(req.query.timeRange);
    return successResponse(res, result);
  } catch (e) {
    return errorResponse(res, 'Lấy thống kê thất bại');
  }
};

const getEventSpeakers = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.getEventSpeakers(parseInt(id));
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách diễn giả thất bại');
  }
};

module.exports = {
  getEvents, getEventById, createEvent, updateEvent, deleteEvent,
  submitForApproval,
  cancelEvent,
  getSessions, addSession, updateSession, deleteSession,
  unlockEventEdit, getCategories, getVenues, getDashboardStats,
  getEventSpeakers,
};
