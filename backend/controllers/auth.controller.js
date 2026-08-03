const fs = require('fs');
const authService = require('../services/auth.service');
const {
  successResponse, createdResponse, errorResponse,
  unauthorizedResponse, notFoundResponse, conflictResponse, forbiddenResponse,
} = require('../utils/response');

// [Đăng ký tài khoản] Gọi từ auth.routes -> Kiểm tra file upload -> Gọi authService.register
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body, req.files);
    return createdResponse(res, result.user, result.message);
  } catch (error) {
    if (req.files?.documents) {
      req.files.documents.forEach(f => fs.unlink(f.path, () => {}));
    }
    if (error.message.startsWith('CONFLICT')) return conflictResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Đăng ký thất bại. Vui lòng thử lại.');
  }
};

// [Gửi lại hồ sơ BTC] Gọi từ route -> Gọi authService.resubmitOrganizer
const resubmitOrganizer = async (req, res) => {
  try {
    const result = await authService.resubmitOrganizer(req.body, req.files);
    return successResponse(res, null, result.message);
  } catch (error) {
    if (req.files?.documents) {
      req.files.documents.forEach(f => fs.unlink(f.path, () => {}));
    }
    if (error.message.startsWith('UNAUTHORIZED')) return unauthorizedResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Gửi lại hồ sơ thất bại. Vui lòng thử lại.');
  }
};

// [Xác thực Email] Gọi từ route -> Trả về thông báo (hiện tại tự động kích hoạt)
const verifyEmail = async (req, res) => {
  return successResponse(res, null, 'Xác thực email không cần thiết. Tài khoản đã được kích hoạt.');
};

// [Gửi lại email xác thực] Gọi từ route -> Gọi authService.resendVerification
const resendVerification = async (req, res) => {
  try {
    const result = await authService.resendVerification(req.body.email);
    return successResponse(res, null, result.message);
  } catch (error) {
    return errorResponse(res, 'Gửi lại email xác thực thất bại');
  }
};

// [Đăng nhập] Gọi từ auth.routes -> Gọi authService.login -> Lưu refresh_token vào Cookie -> Trả access_token
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    return successResponse(res, result, 'Đăng nhập thành công');
  } catch (error) {
    if (error.message.startsWith('REJECTED_ORGANIZER::')) {
      const payload = JSON.parse(error.message.split('::')[1]);
      return res.status(403).json({ success: false, ...payload });
    }
    if (error.message.startsWith('UNAUTHORIZED')) return unauthorizedResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Đăng nhập thất bại. Vui lòng thử lại.');
  }
};

// [Làm mới Token] Gọi từ route -> Gọi authService.refreshToken
const refreshToken = async (req, res) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    return successResponse(res, result, 'Token refreshed');
  } catch (error) {
    if (error.message.startsWith('UNAUTHORIZED')) return unauthorizedResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Token refresh failed');
  }
};

// [Đăng xuất] Gọi từ route -> Gọi authService.logout -> Xóa refresh token
const logout = async (req, res) => {
  try {
    await authService.logout(req.user.UserID);
    return successResponse(res, null, 'Đăng xuất thành công');
  } catch (error) {
    return errorResponse(res, 'Đăng xuất thất bại');
  }
};

// [Lấy thông tin cá nhân] Gọi từ route (authenticate) -> Gọi authService.getMe
const getMe = async (req, res) => {
  try {
    const exactUserId = req.user?.UserID || req.user?.userId || req.user?.id;
    const result = await authService.getMe(exactUserId);
    return successResponse(res, result);
  } catch (error) {
    if (error.message.startsWith('UNAUTHORIZED')) return errorResponse(res, error.message.split(': ')[1], 401);
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, 'User not found');
    return errorResponse(res, 'Failed to fetch user info');
  }
};

// [Cập nhật thông tin cá nhân] Gọi từ route -> Gọi authService.updateMe
const updateMe = async (req, res) => {
  try {
    const exactUserId = req.user?.UserID || req.user?.userId || req.user?.id;
    await authService.updateMe(exactUserId, req.user.Role, req.body, req.files);
    return successResponse(res, null, 'Cập nhật hồ sơ thành công');
  } catch (error) {
    return errorResponse(res, 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
  }
};

// [Quên mật khẩu] Gọi từ route -> Gọi authService.forgotPassword -> Gửi email reset
const forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    return successResponse(res, null, 'Đã gửi link đặt lại mật khẩu đến email của bạn.');
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return errorResponse(res, error.message.split(': ')[1], 404);
    if (error.message.startsWith('FORBIDDEN')) return errorResponse(res, error.message.split(': ')[1], 403);
    return errorResponse(res, 'Yêu cầu đặt lại mật khẩu thất bại');
  }
};

// [Đặt lại mật khẩu] Gọi từ route -> Gọi authService.resetPassword
const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    return successResponse(res, null, 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Đặt lại mật khẩu thất bại');
  }
};

// [Đổi mật khẩu] Gọi từ route (authenticate) -> Gọi authService.changePassword
const changePassword = async (req, res) => {
  try {
    await authService.changePassword(req.user.UserID, req.body.currentPassword, req.body.newPassword);
    return successResponse(res, null, 'Đổi mật khẩu thành công');
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Đổi mật khẩu thất bại');
  }
};

// [Đăng nhập Google OAuth] Gọi từ route -> Xác thực idToken Google -> Gọi authService.googleLogin
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return errorResponse(res, 'Token Google không hợp lệ', 400);
    const result = await authService.googleLogin(idToken);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return successResponse(res, {
      accessToken: result.accessToken,
      user: result.user
    }, 'Đăng nhập Google thành công');
  } catch (error) {
    console.error('[Google Login Error]:', error);
    if (error.message.startsWith('UNAUTHORIZED')) return errorResponse(res, error.message.split(': ')[1], 401);
    if (error.message.startsWith('FORBIDDEN')) return errorResponse(res, error.message.split(': ')[1], 403);
    return errorResponse(res, 'Đăng nhập Google thất bại');
  }
};

// [Tạo tài khoản Diễn giả] Gọi từ route -> Gọi authService.createSpeaker
const createSpeaker = async (req, res) => {
  try {
    const result = await authService.createSpeaker(req.body);
    return createdResponse(res, result, 'Đã tạo tài khoản diễn giả. Tài khoản cần được Admin phê duyệt trước khi kích hoạt.');
  } catch (error) {
    if (error.message.startsWith('CONFLICT')) return conflictResponse(res, error.message.split(': ')[1]);
    return errorResponse(res, 'Tạo tài khoản diễn giả thất bại');
  }
};

// [Duyệt/Từ chối Diễn giả] Gọi từ route (Admin) -> Gọi authService.approveSpeaker
const approveSpeaker = async (req, res) => {
  try {
    const { speakerId } = req.params;
    const { action, rejectionReason } = req.body;
    const result = await authService.approveSpeaker(parseInt(speakerId), action, rejectionReason);
    return successResponse(res, result.resetToken ? { resetToken: result.resetToken } : null, result.message);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Xử lý phê duyệt diễn giả thất bại');
  }
};

// [Duyệt/Từ chối BTC] Gọi từ route (Admin) -> Gọi authService.approveOrganizer
const approveOrganizer = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { action, rejectionReason } = req.body;
    const result = await authService.approveOrganizer(parseInt(profileId), req.user.UserID, action, rejectionReason);
    return successResponse(res, null, result.message);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return notFoundResponse(res, error.message.split(': ')[1]);
    if (error.message.startsWith('BAD_REQUEST')) return errorResponse(res, error.message.split(': ')[1], 400);
    return errorResponse(res, 'Xử lý phê duyệt thất bại');
  }
};

// [Lấy danh sách BTC chưa duyệt] Gọi từ route (Admin) -> Gọi authService.getPendingOrganizers
const getPendingOrganizers = async (req, res) => {
  try {
    const result = await authService.getPendingOrganizers();
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách thất bại');
  }
};

// [Lấy tất cả BTC] Gọi từ route (Admin) -> Gọi authService.getAllOrganizers
const getAllOrganizers = async (req, res) => {
  try {
    const result = await authService.getAllOrganizers();
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách ban tổ chức thất bại');
  }
};

// [Lấy danh sách Diễn giả chưa duyệt] Gọi từ route (Admin) -> Gọi authService.getPendingSpeakers
const getPendingSpeakers = async (req, res) => {
  try {
    const result = await authService.getPendingSpeakers();
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách diễn giả');
  }
};

// [Lấy tất cả Diễn giả] Gọi từ route (Admin) -> Gọi authService.getAllSpeakers
const getAllSpeakers = async (req, res) => {
  try {
    const result = await authService.getAllSpeakers();
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách diễn giả');
  }
};

// [Cập nhật cài đặt thông báo] Gọi từ route -> Gọi authService.updateSettings
const updateSettings = async (req, res) => {
  try {
    await authService.updateSettings(req.user.UserID, req.body.emailNotifs);
    return successResponse(res, null, 'Cập nhật cài đặt thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi máy chủ');
  }
};

// [Xóa tài khoản] Gọi từ route (authenticate) -> Gọi authService.deleteAccount
const deleteAccount = async (req, res) => {
  try {
    await authService.deleteAccount(req.user.UserID);
    return successResponse(res, null, 'Tài khoản đã được xóa thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi máy chủ');
  }
};

module.exports = {
  register, verifyEmail, resendVerification,
  login, refreshToken, logout, getMe, updateMe,
  forgotPassword, resetPassword, changePassword,
  createSpeaker, approveSpeaker, approveOrganizer,
  getPendingOrganizers, getAllOrganizers,
  getPendingSpeakers, getAllSpeakers,
  updateSettings,
  deleteAccount,
  resubmitOrganizer,
  googleLogin
};