const bcrypt = require('bcryptjs');
const speakerRepository = require('../repositories/speaker.repository');

class SpeakerService {
// [Service: Lấy thông tin event invitation gần nhất] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getPendingInvitation(speakerId) {
    const invitations = await speakerRepository.getPendingInvitations(speakerId);
    return {
      invitations,
      message: invitations.length === 0 ? 'Không có lời mời sự kiện nào' : 'Lấy lời mời thành công'
    };
  }

// [Service: Cập nhật mật khẩu và phản hồi invitation lần đầu] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async firstTimeSetup(speakerId, newPassword, responses) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('BAD_REQUEST: Mật khẩu phải từ 8 ký tự trở lên');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await speakerRepository.updatePassword(speakerId, hashedPassword);

    if (responses && Array.isArray(responses)) {
      for (const r of responses) {
        if (r.accept === false) {
          await speakerRepository.removeSpeakerFromEvent(speakerId, parseInt(r.eventId));
        } else {
          await speakerRepository.acceptInvitation(speakerId, parseInt(r.eventId));
        }
      }
    }
  }

// [Service: Lấy danh sách lời mời hiện có] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getInvitations(userId) {
    return await speakerRepository.getNotifications(userId);
  }

// [Service: Xử lý phản hồi lời mời] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async respondInvitation(speakerId, eventId, action, notificationId) {
    if (action === 'Declined') {
      await speakerRepository.removeSpeakerFromEvent(speakerId, eventId);
    } else if (action === 'Accepted') {
      await speakerRepository.acceptInvitation(speakerId, eventId);
    }

    if (notificationId) {
      await speakerRepository.markNotificationAsRead(notificationId);
    }

    return action === 'Accepted' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời';
  }

// [Service: Lấy danh sách sự kiện mà diễn giả tham gia] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getSpeakerEvents(speakerId) {
    return await speakerRepository.getSpeakerEvents(speakerId);
  }
}

module.exports = new SpeakerService();
