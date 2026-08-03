const {
  successResponse, createdResponse, errorResponse,
  notFoundResponse, forbiddenResponse, conflictResponse,
} = require('../utils/response');
const eventService = require('../services/event.service');

// [Lấy danh sách sự kiện] Gọi từ event.routes -> Validate query params -> Gọi eventService.getEvents
const getEvents = async (req, res) => {
  try {
    console.log('[Event Controller] getEvents query:', req.query);
    const result = await eventService.getEvents(req.query, req.user);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách sự kiện thất bại: ' + error.message);
  }
};

// [Lấy chi tiết sự kiện] Gọi từ route -> Lấy id từ params -> Gọi eventService.getEventById
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

// [Tạo sự kiện] Gọi từ event.routes -> Gọi eventService.createEvent -> Dọn file nếu lỗi
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

// [Cập nhật sự kiện] Gọi từ event.routes -> Lấy id từ params -> Gọi eventService.updateEvent
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

// [Xóa sự kiện] Gọi từ route -> Kiểm tra quyền -> Gọi eventService.deleteEvent
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

// [Gửi sự kiện chờ duyệt] Gọi từ route -> Gọi eventService.submitForApproval
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

// [Hủy sự kiện] Gọi từ event.routes -> Gọi eventService.cancelEvent
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

// [Lấy danh sách phiên họi thảo] Gọi từ route -> Gọi eventService.getSessions
const getSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventService.getSessions(parseInt(id));
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy sessions thất bại'); }
};

// [Thêm phiên họi thảo] Gọi từ route -> Gọi eventService.addSession
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

// [Cập nhật phiên họi thảo] Gọi từ route -> Gọi eventService.updateSession
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

// [Xóa phiên họi thảo] Gọi từ route -> Gọi eventService.deleteSession
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

// [Mở khóa chỉnh sửa sự kiện] Gọi từ route (Admin) -> Gọi eventService.unlockEventEdit
const unlockEventEdit = async (req, res) => {
  try {
    const { id } = req.params;
    await eventService.unlockEventEdit(parseInt(id));
    return successResponse(res, null, 'Đã mở khoá chỉnh sửa sự kiện');
  } catch (e) { return errorResponse(res, 'Mở khoá thất bại'); }
};

// [Lấy danh mục sự kiện] Gọi từ route (public) -> Gọi eventService.getCategories
const getCategories = async (req, res) => {
  try {
    const result = await eventService.getCategories();
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy danh mục thất bại'); }
};

// [Lấy danh sách địa điểm] Gọi từ route (public) -> Gọi eventService.getVenues
const getVenues = async (req, res) => {
  try {
    const result = await eventService.getVenues();
    return successResponse(res, result);
  } catch (e) { return errorResponse(res, 'Lấy địa điểm thất bại'); }
};

// [Lấy thống kê Dashboard] Gọi từ route -> Gọi eventService.getDashboardStats
const getDashboardStats = async (req, res) => {
  try {
    const result = await eventService.getDashboardStats(req.query.timeRange);
    return successResponse(res, result);
  } catch (e) {
    return errorResponse(res, 'Lấy thống kê thất bại');
  }
};

// [Lấy danh sách Diễn giả của sự kiện] Gọi từ route -> Gọi eventService.getEventSpeakers
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
