const { getPool, sql } = require('../config/db');

class AdminRepository {
// [Repository: Lấy sự kiện chờ duyệt] Nhận từ Service -> Query DB
  async getPendingEvents() {
    const pool = getPool();
    const result = await pool.request()
      .query(`
        SELECT e.EventID, e.Title, e.StartDate, e.EndDate, e.CreatedAt, e.ApprovalStatus,
               u.FullName AS OrganizerName, op.OrganizationName
        FROM Events e
        JOIN Users u ON e.OrganizerID = u.UserID
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE e.ApprovalStatus = 'Pending'
        ORDER BY e.CreatedAt ASC
      `);
    return result.recordset;
  }

// [Repository: Lấy sự kiện và nội dung chỉnh sửa] Nhận từ Service -> Query DB
  async getEventWithProposedChanges(eventId) {
    const pool = getPool();
    const result = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT ProposedChanges, EditReason, Title, OrganizerID, Status FROM Events WHERE EventID = @EventID`);
    return result.recordset[0];
  }

// [Repository: Duyệt sự kiện] Nhận từ Service -> Query DB
  async approveEvent(eventId, adminId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('AdminID', sql.Int, adminId)
      .query(`
        UPDATE Events 
        SET ApprovalStatus = 'Approved', Status = 'Published', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), UpdatedAt = GETDATE()
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
      `);
    return result.recordset[0];
  }

// [Repository: Duyệt sự kiện có chỉnh sửa] Nhận từ Service -> Query DB
  async approveEventWithChanges(eventId, adminId, changes) {
    const pool = getPool();
    const request = pool.request()
      .input('EventID', sql.Int, eventId)
      .input('AdminID', sql.Int, adminId)
      .input('P_Title', sql.NVarChar(300), changes.title)
      .input('P_Description', sql.NVarChar(sql.MAX), changes.description)
      .input('P_CoverImageURL', sql.VarChar(500), changes.coverImageURL)
      .input('P_StartDate', sql.DateTime, new Date(changes.startDate))
      .input('P_EndDate', sql.DateTime, new Date(changes.endDate))
      .input('P_RegistrationDeadline', sql.DateTime, changes.registrationDeadline ? new Date(changes.registrationDeadline) : null)
      .input('P_MaxParticipants', sql.Int, changes.maxParticipants || null)
      .input('P_CategoryID', sql.Int, changes.categoryId || null)
      .input('P_VenueID', sql.Int, changes.venueId || null)
      .input('P_IsInternalOnly', sql.Bit, changes.isInternalOnly);

    const result = await request.query(`
        UPDATE Events 
        SET ApprovalStatus = 'Approved', Status = 'Published', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), UpdatedAt = GETDATE(),
            Title = @P_Title, Description = @P_Description, CoverImageURL = @P_CoverImageURL, 
            StartDate = @P_StartDate, EndDate = @P_EndDate, RegistrationDeadline = @P_RegistrationDeadline,
            MaxParticipants = @P_MaxParticipants, CategoryID = @P_CategoryID, VenueID = @P_VenueID, IsInternalOnly = @P_IsInternalOnly,
            ProposedChanges = NULL, EditReason = NULL
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
    `);
    return result.recordset[0];
  }

// [Repository: Xóa các session cũ] Nhận từ Service -> Query DB
  async clearEventSessions(eventId) {
    const pool = getPool();
    await pool.request().input('EventID', sql.Int, eventId).query(`DELETE FROM SessionSpeakers WHERE SessionID IN (SELECT SessionID FROM Sessions WHERE EventID=@EventID)`);
    await pool.request().input('EventID', sql.Int, eventId).query(`DELETE FROM SpeakerInvitations WHERE EventID=@EventID`);
    await pool.request().input('EventID', sql.Int, eventId).query(`DELETE FROM Sessions WHERE EventID=@EventID`);
  }

// [Repository: Thêm session mới] Nhận từ Service -> Query DB
  async insertSession(eventId, session) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('Title', sql.NVarChar(300), session.title)
      .input('Description', sql.NVarChar(sql.MAX), session.description || null)
      .input('StartTime', sql.DateTime, new Date(session.startTime))
      .input('EndTime', sql.DateTime, new Date(session.endTime))
      .input('Location', sql.NVarChar(300), session.location || null)
      .query(`INSERT INTO Sessions (EventID,Title,Description,StartTime,EndTime,Location)
              OUTPUT INSERTED.SessionID
              VALUES (@EventID,@Title,@Description,@StartTime,@EndTime,@Location)`);
    return result.recordset[0].SessionID;
  }

// [Repository: Tìm người dùng qua email] Nhận từ Service -> Query DB
  async findUserByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email.trim())
      .query(`SELECT UserID, Role FROM Users WHERE Email = @Email`);
    return result.recordset[0];
  }

// [Repository: Thêm diễn giả vào session] Nhận từ Service -> Query DB
  async addSpeakerToSession(sessionId, speakerId) {
    const pool = getPool();
    await pool.request()
      .input('SessionID', sql.Int, sessionId)
      .input('SpeakerID', sql.Int, speakerId)
      .query(`IF NOT EXISTS (SELECT 1 FROM SessionSpeakers WHERE SessionID=@SessionID AND SpeakerID=@SpeakerID)
              INSERT INTO SessionSpeakers (SessionID, SpeakerID) VALUES (@SessionID, @SpeakerID)`);
  }

// [Repository: Tạo lời mời diễn giả] Nhận từ Service -> Query DB
  async addSpeakerInvitation(eventId, speakerId, invitedBy) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('SpeakerID', sql.Int, speakerId)
      .input('InvitedBy', sql.Int, invitedBy)
      .query(`IF NOT EXISTS (SELECT 1 FROM SpeakerInvitations WHERE EventID=@EventID AND SpeakerID=@SpeakerID)
              INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status) VALUES (@EventID, @SpeakerID, @InvitedBy, 'Pending')`);
  }

// [Repository: Lấy danh sách diễn giả] Nhận từ Service -> Query DB
  async getEventSpeakers(eventId) {
    const pool = getPool();
    const result = await pool.request().input('EventID', sql.Int, eventId).query(`
        SELECT DISTINCT u.UserID 
        FROM SpeakerInvitations es
        JOIN Users u ON es.SpeakerID = u.UserID
        WHERE es.EventID = @EventID
    `);
    return result.recordset;
  }

// [Repository: Tạo thông báo] Nhận từ Service -> Query DB
  async createNotification(userId, title, message, type, relatedId, relatedType, checkExisting = false) {
    const pool = getPool();
    const req = pool.request()
      .input('UserID', sql.Int, userId)
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('Type', sql.VarChar(30), type)
      .input('RelatedID', sql.Int, relatedId)
      .input('RelatedType', sql.VarChar(50), relatedType);

    if (checkExisting) {
      await req.query(`
        IF NOT EXISTS (SELECT 1 FROM Notifications WHERE UserID=@UserID AND Type=@Type AND RelatedID=@RelatedID AND IsRead=0)
        INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)
      `);
    } else {
      await req.query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);
    }
  }

// [Repository: Lấy người tham gia và nhân viên] Nhận từ Service -> Query DB
  async getEventParticipantsAndStaffs(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT ParticipantID AS UserID FROM Registrations WHERE EventID = @EventID AND Status = 'Registered'
        UNION
        SELECT SpeakerID AS UserID FROM SpeakerInvitations WHERE EventID = @EventID AND Status = 'Accepted'
        UNION
        SELECT StaffID AS UserID FROM EventStaffs WHERE EventID = @EventID
      `);
    return result.recordset;
  }

// [Repository: Từ chối sự kiện] Nhận từ Service -> Query DB
  async rejectEvent(eventId, adminId, reason) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('AdminID', sql.Int, adminId)
      .input('Reason', sql.NVarChar(500), reason)
      .query(`
        UPDATE Events 
        SET ApprovalStatus = 'Rejected', Status = 'Rejected', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), RejectionReason = @Reason, UpdatedAt = GETDATE()
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
      `);
    return result.recordset[0];
  }

// [Repository: Từ chối nội dung chỉnh sửa] Nhận từ Service -> Query DB
  async rejectEventChanges(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        UPDATE Events 
        SET ApprovalStatus = 'Approved', ProposedChanges = NULL, EditReason = NULL, UpdatedAt = GETDATE()
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
      `);
    return result.recordset[0];
  }

// [Repository: Hủy sự kiện] Nhận từ Service -> Query DB
  async cancelEvent(eventId, reason) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('Reason', sql.NVarChar(500), reason)
      .query(`
        UPDATE Events 
        SET Status = 'Cancelled', RejectionReason = @Reason, UpdatedAt = GETDATE()
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
      `);
    return result.recordset[0];
  }

// [Repository: Lấy tất cả người dùng] Nhận từ Service -> Query DB
  async getAllUsers() {
    const pool = getPool();
    const result = await pool.request()
      .query(`
        SELECT UserID, FullName, Email, Role, Phone, IsActive, IsVerified, CreatedAt, IsFPTStudent
        FROM Users
        WHERE Role != 'Admin'
        ORDER BY CreatedAt DESC
      `);
    return result.recordset;
  }

// [Repository: Lấy vai trò người dùng] Nhận từ Service -> Query DB
  async getUserRole(userId) {
    const pool = getPool();
    const result = await pool.request().input('UserID', sql.Int, userId).query('SELECT Role FROM Users WHERE UserID = @UserID');
    return result.recordset[0];
  }

// [Repository: Cập nhật trạng thái người dùng] Nhận từ Service -> Query DB
  async updateUserStatus(userId, isActive) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('IsActive', sql.Bit, isActive)
      .query(`UPDATE Users SET IsActive = @IsActive, UpdatedAt = GETDATE() WHERE UserID = @UserID`);
    return result.rowsAffected[0];
  }

// [Repository: Gửi thông báo hệ thống] Nhận từ Service -> Query DB
  async broadcastNotification(title, message, audience) {
    const pool = getPool();
    let query = `
      INSERT INTO Notifications (UserID, Title, Message, Type, RelatedType)
      SELECT UserID, @Title, @Message, 'General', 'System'
      FROM Users
    `;
    if (audience && audience !== 'All') {
      query += ` WHERE Role = @Audience`;
    }

    const request = pool.request()
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message);
    if (audience && audience !== 'All') {
      request.input('Audience', sql.VarChar(50), audience);
    }
    await request.query(query);
  }

// [Repository: Lấy thống kê Ban tổ chức] Nhận từ Service -> Query DB
  async getOrganizerStats() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        u.UserID, 
        u.FullName, 
        op.OrganizationName, 
        u.AvatarURL,
        (SELECT COUNT(*) FROM Events WHERE OrganizerID = u.UserID AND Status = 'Published') AS PublishedEvents,
        (SELECT COUNT(*) FROM Events e JOIN Registrations r ON e.EventID = r.EventID WHERE e.OrganizerID = u.UserID AND r.Status = 'Registered') AS TotalParticipants,
        (SELECT COUNT(*) FROM Events WHERE OrganizerID = u.UserID AND ApprovalStatus = 'Rejected') AS RejectedEvents,
        (SELECT COUNT(DISTINCT r.TargetID) FROM Reports r JOIN Blogs b2 ON r.TargetID = b2.BlogID WHERE r.TargetType = 'Blog' AND b2.AuthorID = u.UserID AND r.Status = 'Pending') AS ReportedBlogsCount
      FROM Users u
      LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
      WHERE u.Role = 'Organizer'
    `);
    return result.recordset;
  }

// [Repository: Lấy thông báo sự kiện] Nhận từ Service -> Query DB
  async getEventNotifications(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT 
          Title, 
          Message, 
          MAX(CreatedAt) as CreatedAt, 
          COUNT(NotificationID) as ReceiverCount
        FROM Notifications
        WHERE RelatedID = @EventID 
          AND Type = 'General' 
          AND Title LIKE N'📢 [[]BTC] %' 
        GROUP BY Title, Message
        ORDER BY MAX(CreatedAt) DESC
      `);
    return result.recordset;
  }

// [Repository: Thu hồi thông báo sự kiện] Nhận từ Service -> Query DB
  async revokeEventNotification(eventId, title, message) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .query(`
        DELETE FROM Notifications 
        WHERE RelatedID = @EventID 
          AND Type = 'General' 
          AND Title = @Title 
          AND Message = @Message
      `);
  }
}

module.exports = new AdminRepository();
