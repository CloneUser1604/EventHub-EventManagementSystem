const adminRepository = require('../repositories/admin.repository');

class AdminService {
// [Service: Lấy sự kiện chờ duyệt] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getPendingEvents() {
    return await adminRepository.getPendingEvents();
  }

// [Service: Duyệt sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async approveEvent(eventId, adminId) {
    const currentEvent = await adminRepository.getEventWithProposedChanges(eventId);
    if (!currentEvent) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');

    let proposedChangesObj = null;
    if (currentEvent.ProposedChanges) {
      try { proposedChangesObj = JSON.parse(currentEvent.ProposedChanges); } catch (e) {}
    }

    let event;
    if (proposedChangesObj) {
      event = await adminRepository.approveEventWithChanges(eventId, adminId, proposedChangesObj);

      if (proposedChangesObj.sessions) {
        await adminRepository.clearEventSessions(eventId);
        for (const s of proposedChangesObj.sessions) {
          const newSessionId = await adminRepository.insertSession(eventId, s);
          
          if (s.speakerEmails && Array.isArray(s.speakerEmails)) {
            for (const email of s.speakerEmails) {
              const speaker = await adminRepository.findUserByEmail(email);
              if (speaker && speaker.Role === 'Speaker') {
                await adminRepository.addSpeakerToSession(newSessionId, speaker.UserID);
                await adminRepository.addSpeakerInvitation(eventId, speaker.UserID, adminId);
              }
            }
          }
        }

        const newSpeakers = await adminRepository.getEventSpeakers(eventId);
        for (const speaker of newSpeakers) {
          await adminRepository.createNotification(
            speaker.UserID,
            'Lời mời làm Diễn giả',
            `Bạn đã được mời làm diễn giả cho sự kiện "${event.Title}". Vui lòng xác nhận tham gia.`,
            'SpeakerInvitation',
            eventId,
            'Event',
            true // checkExisting
          );
        }
      }
    } else {
      event = await adminRepository.approveEvent(eventId, adminId);
    }

    await adminRepository.createNotification(
      event.OrganizerID,
      proposedChangesObj ? 'Chỉnh sửa sự kiện được duyệt' : 'Sự kiện đã được duyệt',
      proposedChangesObj 
        ? `Sự kiện "${event.Title}" của bạn đã được admin duyệt nội dung chỉnh sửa.`
        : `Sự kiện "${event.Title}" của bạn đã được admin duyệt và đang được hiển thị công khai.`,
      'EventApproval',
      eventId,
      'Event'
    );

    if (!proposedChangesObj) {
      const speakers = await adminRepository.getEventSpeakers(eventId);
      for (const speaker of speakers) {
        await adminRepository.createNotification(
          speaker.UserID,
          'Lời mời làm Diễn giả',
          `Bạn đã được mời làm diễn giả cho sự kiện "${event.Title}". Vui lòng xác nhận tham gia.`,
          'SpeakerInvitation',
          eventId,
          'Event'
        );
      }
    } else {
      const participantsAndStaffs = await adminRepository.getEventParticipantsAndStaffs(eventId);
      for (const p of participantsAndStaffs) {
        await adminRepository.createNotification(
          p.UserID,
          `Sự kiện thay đổi: ${event.Title}`,
          `Sự kiện "${event.Title}" vừa có một số cập nhật. Lý do từ Ban tổ chức: ${currentEvent.EditReason}`,
          'EventUpdate',
          eventId,
          'Event'
        );
      }
    }
  }

// [Service: Từ chối sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async rejectEvent(eventId, adminId, reason) {
    if (!reason) throw new Error('BAD_REQUEST: Vui lòng cung cấp lý do từ chối');
    
    const currentEvent = await adminRepository.getEventWithProposedChanges(eventId);
    if (!currentEvent) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');

    let event;
    let isRejectingChanges = false;
    
    if (currentEvent.ProposedChanges) {
      event = await adminRepository.rejectEventChanges(eventId);
      isRejectingChanges = true;
    } else {
      event = await adminRepository.rejectEvent(eventId, adminId, reason);
    }

    await adminRepository.createNotification(
      event.OrganizerID,
      isRejectingChanges ? 'Yêu cầu chỉnh sửa bị từ chối' : 'Sự kiện bị từ chối',
      isRejectingChanges 
        ? `Yêu cầu chỉnh sửa sự kiện "${event.Title}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Sự kiện "${event.Title}" của bạn đã bị từ chối. Lý do: ${reason}`,
      'EventApproval',
      eventId,
      'Event'
    );

    return { isRejectingChanges };
  }

// [Service: Hủy sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async cancelEvent(eventId, reason) {
    if (!reason) throw new Error('BAD_REQUEST: Vui lòng cung cấp lý do khóa sự kiện');
    
    const event = await adminRepository.cancelEvent(eventId, reason);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');

    await adminRepository.createNotification(
      event.OrganizerID,
      'Sự kiện bị khóa',
      `Sự kiện "${event.Title}" của bạn đã bị khóa bởi Admin. Lý do: ${reason}`,
      'EventUpdate',
      eventId,
      'Event'
    );
  }

// [Service: Lấy tất cả người dùng] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getAllUsers() {
    return await adminRepository.getAllUsers();
  }

// [Service: Cập nhật trạng thái người dùng] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async updateUserStatus(userId, isActive) {
    if (typeof isActive !== 'boolean') throw new Error('BAD_REQUEST: Trạng thái isActive phải là boolean');
    
    const userRoleInfo = await adminRepository.getUserRole(userId);
    if (userRoleInfo && userRoleInfo.Role === 'Admin') {
      throw new Error('FORBIDDEN: Không thể thao tác trên tài khoản Admin');
    }

    const affected = await adminRepository.updateUserStatus(userId, isActive);
    if (affected === 0) throw new Error('NOT_FOUND: Không tìm thấy người dùng');
  }

// [Service: Gửi thông báo hệ thống] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async broadcastNotification(title, message, audience) {
    if (!title || !message) throw new Error('BAD_REQUEST: Vui lòng nhập tiêu đề và nội dung');
    await adminRepository.broadcastNotification(title, message, audience);
  }

// [Service: Lấy thống kê Ban tổ chức] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getOrganizerStats() {
    const allOrgs = await adminRepository.getOrganizerStats();
    
    const mapped = allOrgs.map(org => ({
      ...org,
      RiskScore: org.RejectedEvents * 2 + org.ReportedBlogsCount * 3,
      PerformanceScore: org.PublishedEvents * 10 + org.TotalParticipants
    }));

    const topOrganizers = [...mapped].sort((a, b) => b.PerformanceScore - a.PerformanceScore).slice(0, 10);
    const riskOrganizers = [...mapped].filter(o => o.RiskScore > 0).sort((a, b) => b.RiskScore - a.RiskScore);

    return { topOrganizers, riskOrganizers };
  }

// [Service: Lấy thông báo sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async getEventNotifications(eventId) {
    return await adminRepository.getEventNotifications(eventId);
  }

// [Service: Thu hồi thông báo sự kiện] Nhận từ Controller -> Xử lý logic -> gọi Repository
  async revokeEventNotification(eventId, title, message) {
    await adminRepository.revokeEventNotification(eventId, title, message);
  }
}

module.exports = new AdminService();
