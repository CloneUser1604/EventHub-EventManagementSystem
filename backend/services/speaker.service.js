const bcrypt = require('bcryptjs');
const speakerRepository = require('../repositories/speaker.repository');

class SpeakerService {
  async getPendingInvitation(speakerId) {
    const invitations = await speakerRepository.getPendingInvitations(speakerId);
    return {
      invitations,
      message: invitations.length === 0 ? 'Không có lời mời sự kiện nào' : 'Lấy lời mời thành công'
    };
  }

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

  async getInvitations(userId) {
    return await speakerRepository.getNotifications(userId);
  }

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

  async getSpeakerEvents(speakerId) {
    return await speakerRepository.getSpeakerEvents(speakerId);
  }
}

module.exports = new SpeakerService();
