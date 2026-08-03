const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const staffRepository = require('../repositories/staff.repository');

class StaffService {
  // [Lấy danh sách người tham gia] Nhận từ Controller -> Kiểm tra quyền Staff/Organizer -> Gọi Repository
  async getEventParticipants(eventId, userId, role) {
    if (role !== 'Organizer' && role !== 'Admin') {
      const hasAccess = await staffRepository.checkStaffAccess(eventId, userId);
      if (!hasAccess) throw new Error('FORBIDDEN: Bạn không có quyền truy cập');
    }
    return await staffRepository.getEventParticipants(eventId);
  }

  // [Lấy danh sách Staff khả dụng] Nhận từ Controller -> Gọi Repository
  async getAvailableStaff(eventId) {
    return await staffRepository.getAvailableStaff(eventId);
  }

  // [Tạo Staff] Nhận từ Controller -> Kiểm tra email tồn tại -> Mã hóa pass -> Gọi Repository
  async createStaff(data) {
    const exists = await staffRepository.findUserByEmail(data.email);
    if (exists) throw new Error('BAD_REQUEST: Email đã tồn tại');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password || '123456', salt);

    await staffRepository.createStaff({
      ...data,
      passwordHash: hashedPassword,
      role: data.role || 'Staff'
    });
  }

  // [Cập nhật Staff] Nhận từ Controller -> Gọi Repository update
  async updateStaff(staffId, data) {
    await staffRepository.updateStaff(staffId, {
      fullName: data.fullName,
      phone: data.phone || null,
      role: data.role || 'Staff',
      isActive: data.isActive !== undefined ? data.isActive : 1
    });
  }

  // [Xóa Staff] Nhận từ Controller -> Gọi Repository
  async deleteStaff(staffId) {
    await staffRepository.deleteStaff(staffId);
  }

  // [Lấy danh sách Staff đã gán cho sự kiện] Nhận từ Controller -> Gọi Repository
  async getAssignedStaff(eventId) {
    return await staffRepository.getAssignedStaff(eventId);
  }

  // [Lấy danh sách sự kiện của Staff] Nhận từ Controller -> Gọi Repository
  async getMyEvents(staffId) {
    return await staffRepository.getMyEvents(staffId);
  }

  // [Gán Staff vào sự kiện] Nhận từ Controller -> Kiểm tra trùng lịch -> Gọi Repository gán và gửi thông báo
  async assignStaff(eventId, staffIds, adminId) {
    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      throw new Error('BAD_REQUEST: Vui lòng chọn ít nhất một Staff');
    }

    const currentEvent = await staffRepository.getEventById(eventId);
    if (!currentEvent) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');

    const errors = [];
    let successCount = 0;

    for (const staffId of staffIds) {
      const hasAccess = await staffRepository.checkStaffAccess(eventId, staffId);
      if (hasAccess) continue;

      const conflictEvent = await staffRepository.checkOverlap(staffId, eventId, currentEvent.StartDate, currentEvent.EndDate);
      if (conflictEvent) {
        errors.push(`Staff ID ${staffId} bị trùng lịch với sự kiện "${conflictEvent.Title}"`);
        continue;
      }

      await staffRepository.assignStaff(eventId, staffId, adminId);
      await staffRepository.createNotification(
        staffId,
        'Phân công sự kiện mới',
        `Bạn đã được Admin phân công hỗ trợ sự kiện "${currentEvent.Title}".`,
        'General'
      );
      successCount++;
    }

    if (errors.length > 0) {
      return {
        isPartialSuccess: true,
        message: `Đã gán thành công ${successCount} staff. Tuy nhiên có lỗi xảy ra: ${errors.join(', ')}`,
        errors
      };
    }

    return { message: `Đã gán thành công ${successCount} Staff.` };
  }

  // [Sinh token JWT phiên check-in] Dùng nội bộ (không async) -> Ký JWT với eventId và staffId
  generateStaffSession(eventId, staffId) {
    return jwt.sign(
      { eventId, staffId, type: 'checkin_session' },
      process.env.JWT_SECRET || 'ems_super_secret_key',
      { expiresIn: '24h' }
    );
  }

  // [Kiểm tra quyền Staff] Nhận từ Controller -> Gọi Repository kiểm tra EventStaff
  async checkStaffAccess(eventId, staffId) {
    return await staffRepository.checkStaffAccess(eventId, staffId);
  }

  // [Thu hồi quyền Staff] Nhận từ Controller -> Gọi Repository xóa khỏi EventStaff
  async revokeStaff(eventId, staffId) {
    await staffRepository.revokeStaff(eventId, staffId);
  }

  // [Participant tự check-in bằng OTP] Nhận từ Controller -> Kiểm tra OTP + thời gian -> Gọi Repository ghi Attendance
  async participantCheckinWithOTP(eventId, participantId, staffId, otp) {
    if (!otp || !staffId) throw new Error('BAD_REQUEST: Thiếu mã OTP hoặc Staff ID');

    const hasAccess = await staffRepository.checkStaffAccess(eventId, staffId);
    if (!hasAccess) throw new Error('BAD_REQUEST: Staff này không tồn tại hoặc không có quyền');

    const reg = await staffRepository.getRegistrationWithOTP(eventId, participantId);
    if (!reg) throw new Error('BAD_REQUEST: Bạn chưa đăng ký sự kiện này');

    const now = new Date();
    const startDate = new Date(reg.StartDate);
    const endDate = new Date(reg.EndDate);

    if (now < startDate) throw new Error('BAD_REQUEST: Sự kiện chưa diễn ra, không thể check-in');
    if (now > endDate) throw new Error('BAD_REQUEST: Sự kiện đã kết thúc, không thể check-in');
    if (reg.Status !== 'Registered') throw new Error('BAD_REQUEST: Đăng ký của bạn không hợp lệ');
    if (reg.OTPCode !== otp) throw new Error('BAD_REQUEST: Mã OTP không chính xác');
    if (reg.IsUsed) throw new Error('BAD_REQUEST: Mã OTP này đã được sử dụng');

    await staffRepository.markOTPAsUsed(reg.RegistrationID);
    await staffRepository.createAttendanceRecord(reg.RegistrationID, staffId);
  }
}

module.exports = new StaffService();
