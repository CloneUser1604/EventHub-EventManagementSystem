const crypto = require('crypto');
const registrationRepository = require('../repositories/registration.repository');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateQRToken = () => crypto.randomBytes(20).toString('hex');

class RegistrationService {
  // ─── REGISTER EVENT ──────────────────────────────────────────────
async registerEvent(eventId, participantId) {
    const event = await registrationRepository.findEventForRegistration(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    if (event.Status !== 'Published') throw new Error('BAD_REQUEST: Sự kiện chưa được công bố');
    if (event.RegistrationDeadline && new Date() > new Date(event.RegistrationDeadline)) {
      throw new Error('BAD_REQUEST: Đã hết hạn đăng ký');
    }
    if (event.MaxParticipants && event.RegisteredCount >= event.MaxParticipants) {
      throw new Error('BAD_REQUEST: Sự kiện đã đầy chỗ');
    }

    const userUniv = await registrationRepository.findUserUniversity(participantId);
    if (event.IsInternalOnly && userUniv !== 'Đại học FPT') {
      throw new Error('FORBIDDEN: Sự kiện này chỉ dành cho sinh viên trường Đại học FPT');
    }

    const dup = await registrationRepository.findDuplicateRegistration(eventId, participantId);
    if (dup) {
      if (dup.Status === 'Registered') throw new Error('CONFLICT: Bạn đã đăng ký sự kiện này');
      
      // Re-register if cancelled
      await registrationRepository.updateRegistrationStatus(dup.RegistrationID, 'Registered');
      return { action: 're-register', data: { registrationId: dup.RegistrationID } };
    }

    const registrationId = await registrationRepository.insertRegistration(eventId, participantId);
    const qrCode = generateQRToken();
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // valid until event ends

    await registrationRepository.insertQRTicket(registrationId, qrCode, otpCode, otpExpiry);

    await registrationRepository.insertNotification(
      participantId,
      `🎟️ Đăng ký thành công: ${event.Title}`,
      `Bạn đã đăng ký thành công sự kiện "${event.Title}". Mã OTP của bạn: ${otpCode}. Giữ mã này để check-in.`,
      'Registration',
      eventId,
      'Event'
    );

    return { action: 'register', data: { registrationId, qrCode, otpCode } };
  }

  // ─── CANCEL REGISTRATION ──────────────────────────────────────────────
async cancelRegistration(registrationId, participantId, note) {
    const reg = await registrationRepository.findRegistrationForCancel(registrationId);
    if (!reg) throw new Error('NOT_FOUND: Không tìm thấy đăng ký');
    if (reg.ParticipantID !== participantId) throw new Error('FORBIDDEN: ');
    if (reg.Status !== 'Registered') throw new Error('BAD_REQUEST: Đăng ký này không thể huỷ');
    if (reg.RegistrationDeadline && new Date() > new Date(reg.RegistrationDeadline)) {
      throw new Error('BAD_REQUEST: Đã qua hạn huỷ đăng ký');
    }

    await registrationRepository.updateRegistrationStatus(registrationId, 'Cancelled', note);
    return reg.EventTitle;
  }
}

module.exports = new RegistrationService();
