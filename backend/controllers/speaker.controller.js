const speakerService = require('../services/speaker.service');
const { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } = require('../utils/response');

// [Controller: Lấy thông tin event invitation gần nhất] Gọi từ Route -> Validate -> gọi Service
const getPendingInvitation = async (req, res) => {
  try {
    const result = await speakerService.getPendingInvitation(parseInt(req.params.userId));
    return successResponse(res, result.invitations, result.message);
  } catch (error) {
    console.error('getPendingInvitation error:', error);
    return errorResponse(res, 'Lỗi lấy lời mời sự kiện');
  }
};

// [Controller: Cập nhật mật khẩu và phản hồi invitation lần đầu] Gọi từ Route -> Validate -> gọi Service
const firstTimeSetup = async (req, res) => {
  try {
    await speakerService.firstTimeSetup(parseInt(req.params.userId), req.body.newPassword, req.body.responses);
    return successResponse(res, null, 'Cập nhật tài khoản thành công. Vui lòng đăng nhập lại.');
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    console.error('firstTimeSetup error:', error);
    return errorResponse(res, 'Cập nhật tài khoản thất bại');
  }
};

// [Controller: Lấy danh sách lời mời hiện có] Gọi từ Route -> Validate -> gọi Service
const getInvitations = async (req, res) => {
  try {
    const data = await speakerService.getInvitations(req.user.UserID);
    return successResponse(res, data, 'Lấy danh sách lời mời thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách lời mời');
  }
};

// [Controller: Xử lý phản hồi lời mời] Gọi từ Route -> Validate -> gọi Service
const respondInvitation = async (req, res) => {
  try {
    const message = await speakerService.respondInvitation(req.user.UserID, parseInt(req.params.eventId), req.body.action, req.body.notificationId);
    return successResponse(res, null, message);
  } catch (error) {
    return errorResponse(res, 'Xử lý phản hồi thất bại');
  }
};

// [Controller: Lấy danh sách sự kiện mà diễn giả tham gia] Gọi từ Route -> Validate -> gọi Service
const getSpeakerEvents = async (req, res) => {
  try {
    const data = await speakerService.getSpeakerEvents(req.user.UserID);
    return successResponse(res, data, 'Lấy danh sách sự kiện thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy sự kiện');
  }
};

module.exports = {
  getPendingInvitation,
  firstTimeSetup,
  getInvitations,
  respondInvitation,
  getSpeakerEvents
};
