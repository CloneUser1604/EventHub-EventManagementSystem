const jwt = require('jsonwebtoken');
const checkinRepository = require('../repositories/checkin.repository');

class CheckinService {
  async verifyOTP(participantId, qrToken, otpCode) {
    if (!qrToken || !otpCode) {
      throw new Error('BAD_REQUEST: Cần cung cấp mã phiên check-in của Staff và mã OTP');
    }

    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET || 'ems_super_secret_key');
    } catch (err) {
      throw new Error('BAD_REQUEST: Mã QR của Staff không hợp lệ hoặc đã hết hạn');
    }

    if (decoded.type !== 'checkin_session' || !decoded.eventId || !decoded.staffId) {
      throw new Error('BAD_REQUEST: Mã QR không phải là phiên check-in hợp lệ');
    }

    const { eventId, staffId } = decoded;

    const registration = await checkinRepository.getRegistration(eventId, participantId);
    if (!registration || registration.Status !== 'Registered') {
      throw new Error('FORBIDDEN: Bạn chưa đăng ký hoặc đăng ký đã bị huỷ');
    }

    const now = new Date();
    const startDate = new Date(registration.StartDate);
    const endDate = new Date(registration.EndDate);

    if (now < startDate) throw new Error('BAD_REQUEST: Sự kiện chưa diễn ra, không thể check-in');
    if (now > endDate) throw new Error('BAD_REQUEST: Sự kiện đã kết thúc, không thể check-in');

    const ticket = await checkinRepository.getTicket(registration.RegistrationID);
    if (!ticket) throw new Error('NOT_FOUND: Không tìm thấy vé');
    if (ticket.IsUsed) throw new Error('BAD_REQUEST: Vé này đã được sử dụng (bạn đã check-in)');
    if (ticket.OTPCode !== otpCode) throw new Error('BAD_REQUEST: Mã OTP không chính xác');

    await checkinRepository.performCheckin(ticket.TicketID, registration.RegistrationID, staffId);
  }
}

module.exports = new CheckinService();
