const { getPool, sql } = require('../config/db');

class SpeakerRepository {
  // [Lấy danh sách lời mời cơ sự] Nhận từ Service -> SELECT SpeakerInvitations JOIN Events
  async getPendingInvitations(speakerId) {
    const pool = getPool();
    const result = await pool.request()
      .input('SpeakerID', sql.Int, speakerId)
      .query(`
        SELECT DISTINCT e.EventID, e.Title, e.StartDate, e.EndDate, es.CreatedAt as InvitedAt
        FROM SpeakerInvitations es
        JOIN Events e ON es.EventID = e.EventID
        JOIN Sessions s ON s.EventID = e.EventID
        JOIN SessionSpeakers ss ON ss.SessionID = s.SessionID AND ss.SpeakerID = es.SpeakerID
        WHERE es.SpeakerID = @SpeakerID 
          AND e.Status = 'Published' 
          AND e.ApprovalStatus = 'Approved'
          AND es.Status = 'Pending'
        ORDER BY InvitedAt DESC
      `);
    return result.recordset;
  }

  // [Cập nhật mật khẩu lần đầu] Nhận từ Service -> UPDATE Users.PasswordHash
  async updatePassword(userId, passwordHash) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .query(`
        UPDATE Users 
        SET PasswordHash = @PasswordHash, MustChangePassword = 0, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);
  }

  // [Gỡ Diễn giả khỏi sự kiện] Nhận từ Service -> DELETE SessionSpeakers + SpeakerInvitations
  async removeSpeakerFromEvent(speakerId, eventId) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('SpeakerID', sql.Int, speakerId)
      .query(`
        DELETE FROM SessionSpeakers 
        WHERE SpeakerID = @SpeakerID AND SessionID IN (SELECT SessionID FROM Sessions WHERE EventID = @EventID);
        
        DELETE FROM SpeakerInvitations 
        WHERE EventID = @EventID AND SpeakerID = @SpeakerID;
      `);
  }

  // [Chấp nhận lời mời] Nhận từ Service -> UPDATE SpeakerInvitations.Status = Accepted
  async acceptInvitation(speakerId, eventId) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('SpeakerID', sql.Int, speakerId)
      .query(`UPDATE SpeakerInvitations SET Status = 'Accepted' WHERE EventID = @EventID AND SpeakerID = @SpeakerID`);
  }

  // [Lấy thông báo lời mời] Nhận từ Service -> SELECT Notifications theo userId
  async getNotifications(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT n.* FROM Notifications n
        JOIN Events e ON n.RelatedID = e.EventID
        WHERE n.UserID = @UserID 
          AND n.Type = 'SpeakerInvitation'
          AND e.Status IN ('Published', 'Completed')
        ORDER BY n.CreatedAt DESC
      `);
    return result.recordset;
  }

  // [Đánh dấu thông báo đã đọc] Nhận từ Service -> UPDATE Notifications.IsRead = 1
  async markNotificationAsRead(notificationId) {
    const pool = getPool();
    await pool.request()
      .input('NotificationID', sql.Int, notificationId)
      .query('UPDATE Notifications SET IsRead = 1 WHERE NotificationID = @NotificationID');
  }

  // [Lấy danh sách sự kiện của Diễn giả] Nhận từ Service -> SELECT Events từ SpeakerInvitations
  async getSpeakerEvents(speakerId) {
    const pool = getPool();
    const result = await pool.request()
      .input('SpeakerID', sql.Int, speakerId)
      .query(`
        SELECT DISTINCT e.EventID, e.Title, e.StartDate, e.EndDate, e.Status, e.CoverImageURL
        FROM SpeakerInvitations es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.SpeakerID = @SpeakerID
          AND e.Status IN ('Published', 'Completed')
        ORDER BY e.StartDate DESC
      `);
    return result.recordset;
  }
}

module.exports = new SpeakerRepository();
