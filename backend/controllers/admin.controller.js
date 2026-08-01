const adminService = require('../services/admin.service');

// [Lấy sự kiện chờ duyệt] Gọi từ Route -> Gọi adminService.getPendingEvents
const getPendingEvents = async (req, res) => {
  try {
    const data = await adminService.getPendingEvents();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get pending events error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sự kiện chờ duyệt' });
  }
};

// [Duyệt sự kiện] Gọi từ Route -> Gọi adminService.approveEvent
const approveEvent = async (req, res) => {
  try {
    await adminService.approveEvent(parseInt(req.params.eventId), req.user.UserID);
    return res.status(200).json({ success: true, message: 'Đã duyệt sự kiện thành công' });
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Approve event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi duyệt sự kiện' });
  }
};

// [Từ chối sự kiện] Gọi từ Route -> Gọi adminService.rejectEvent
const rejectEvent = async (req, res) => {
  try {
    const result = await adminService.rejectEvent(parseInt(req.params.eventId), req.user.UserID, req.body.reason);
    return res.status(200).json({ success: true, message: result.isRejectingChanges ? 'Đã từ chối chỉnh sửa' : 'Đã từ chối sự kiện' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Reject event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi từ chối sự kiện' });
  }
};

// [Hủy sự kiện] Gọi từ Route -> Gọi adminService.cancelEvent
const cancelEvent = async (req, res) => {
  try {
    await adminService.cancelEvent(parseInt(req.params.eventId), req.body.reason);
    return res.status(200).json({ success: true, message: 'Đã khóa sự kiện thành công' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Cancel event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi khóa sự kiện' });
  }
};

// [Lấy tất cả người dùng] Gọi từ Route -> Gọi adminService.getAllUsers
const getAllUsers = async (req, res) => {
  try {
    const data = await adminService.getAllUsers();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
  }
};

// [Cập nhật trạng thái người dùng] Gọi từ Route -> Gọi adminService.updateUserStatus
const updateUserStatus = async (req, res) => {
  try {
    await adminService.updateUserStatus(parseInt(req.params.userId), req.body.isActive);
    return res.status(200).json({ success: true, message: `Đã ${req.body.isActive ? 'kích hoạt' : 'vô hiệu hoá'} tài khoản thành công` });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('FORBIDDEN')) return res.status(403).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Update user status error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái người dùng' });
  }
};

// [Gửi thông báo hệ thống] Gọi từ Route -> Gọi adminService.broadcastNotification
const broadcastNotification = async (req, res) => {
  try {
    await adminService.broadcastNotification(req.body.title, req.body.message, req.body.audience);
    return res.status(200).json({ success: true, message: 'Đã gửi thông báo thành công' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Broadcast notification error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi thông báo' });
  }
};

// [Lấy thống kê Ban tổ chức] Gọi từ Route -> Gọi adminService.getOrganizerStats
const getOrganizerStats = async (req, res) => {
  try {
    const data = await adminService.getOrganizerStats();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get organizer stats error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu BTC' });
  }
};

// [Lấy thông báo sự kiện] Gọi từ Route -> Gọi adminService.getEventNotifications
const getEventNotifications = async (req, res) => {
  try {
    const data = await adminService.getEventNotifications(parseInt(req.params.eventId));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get event notifications error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo sự kiện' });
  }
};

// [Thu hồi thông báo sự kiện] Gọi từ Route -> Gọi adminService.revokeEventNotification
const revokeEventNotification = async (req, res) => {
  try {
    await adminService.revokeEventNotification(parseInt(req.params.eventId), req.body.title, req.body.message);
    return res.status(200).json({ success: true, message: 'Đã thu hồi thông báo thành công khỏi tất cả người nhận' });
  } catch (error) {
    console.error('Revoke notification error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi thu hồi thông báo' });
  }
};

module.exports = {
  getPendingEvents,
  approveEvent,
  rejectEvent,
  cancelEvent,
  getAllUsers,
  updateUserStatus,
  broadcastNotification,
  getOrganizerStats,
  getEventNotifications,
  revokeEventNotification 
};