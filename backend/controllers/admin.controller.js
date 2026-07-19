const { getPool, sql } = require('../config/db');

// ─── GET PENDING EVENTS ──────────────────────────────────────────
const getPendingEvents = async (req, res) => {
  try {
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

    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get pending events error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sự kiện chờ duyệt' });
  }
};

// ─── APPROVE EVENT ───────────────────────────────────────────────
const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const adminId = req.user.UserID;

    const pool = getPool();
    
    const eventCheck = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT ProposedChanges, EditReason, Title, OrganizerID FROM Events WHERE EventID = @EventID`);
    const currentEvent = eventCheck.recordset[0];
    if (!currentEvent) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

    let updateQuery = `
      UPDATE Events 
      SET ApprovalStatus = 'Approved', Status = 'Published', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), UpdatedAt = GETDATE()
      OUTPUT INSERTED.Title, INSERTED.OrganizerID
      WHERE EventID = @EventID
    `;

    let proposedChangesObj = null;
    if (currentEvent.ProposedChanges) {
      try {
        proposedChangesObj = JSON.parse(currentEvent.ProposedChanges);
      } catch (e) {}
    }

    const request = pool.request()
      .input('EventID', sql.Int, eventId)
      .input('AdminID', sql.Int, adminId);

    if (proposedChangesObj) {
      request.input('P_Title', sql.NVarChar(300), proposedChangesObj.title);
      request.input('P_Description', sql.NVarChar(sql.MAX), proposedChangesObj.description);
      request.input('P_CoverImageURL', sql.VarChar(500), proposedChangesObj.coverImageURL);
      request.input('P_StartDate', sql.DateTime, new Date(proposedChangesObj.startDate));
      request.input('P_EndDate', sql.DateTime, new Date(proposedChangesObj.endDate));
      request.input('P_RegistrationDeadline', sql.DateTime, proposedChangesObj.registrationDeadline ? new Date(proposedChangesObj.registrationDeadline) : null);
      request.input('P_MaxParticipants', sql.Int, proposedChangesObj.maxParticipants || null);
      request.input('P_CategoryID', sql.Int, proposedChangesObj.categoryId || null);
      request.input('P_VenueID', sql.Int, proposedChangesObj.venueId || null);
      request.input('P_IsInternalOnly', sql.Bit, proposedChangesObj.isInternalOnly);

      updateQuery = `
          UPDATE Events 
          SET ApprovalStatus = 'Approved', Status = 'Published', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), UpdatedAt = GETDATE(),
              Title = @P_Title, Description = @P_Description, CoverImageURL = @P_CoverImageURL, 
              StartDate = @P_StartDate, EndDate = @P_EndDate, RegistrationDeadline = @P_RegistrationDeadline,
              MaxParticipants = @P_MaxParticipants, CategoryID = @P_CategoryID, VenueID = @P_VenueID, IsInternalOnly = @P_IsInternalOnly,
              ProposedChanges = NULL, EditReason = NULL
          OUTPUT INSERTED.Title, INSERTED.OrganizerID
          WHERE EventID = @EventID
      `;
    }

    const result = await request.query(updateQuery);
    const event = result.recordset[0];

    // Cập nhật sessions nếu có trong bản chỉnh sửa
    if (proposedChangesObj && proposedChangesObj.sessions) {
      await pool.request().input('EventID', sql.Int, parseInt(eventId)).query(`DELETE FROM SessionSpeakers WHERE SessionID IN (SELECT SessionID FROM Sessions WHERE EventID=@EventID)`);
      await pool.request().input('EventID', sql.Int, parseInt(eventId)).query(`DELETE FROM SpeakerInvitations WHERE EventID=@EventID`);
      await pool.request().input('EventID', sql.Int, parseInt(eventId)).query(`DELETE FROM Sessions WHERE EventID=@EventID`);

      for (const s of proposedChangesObj.sessions) {
        const sessionResult = await pool.request()
          .input('EventID', sql.Int, parseInt(eventId))
          .input('Title', sql.NVarChar(300), s.title)
          .input('Description', sql.NVarChar(sql.MAX), s.description || null)
          .input('StartTime', sql.DateTime, new Date(s.startTime))
          .input('EndTime', sql.DateTime, new Date(s.endTime))
          .input('Location', sql.NVarChar(300), s.location || null)
          .query(`INSERT INTO Sessions (EventID,Title,Description,StartTime,EndTime,Location)
                  OUTPUT INSERTED.SessionID
                  VALUES (@EventID,@Title,@Description,@StartTime,@EndTime,@Location)`);
                  
        const newSessionId = sessionResult.recordset[0].SessionID;

        if (s.speakerEmails && Array.isArray(s.speakerEmails) && s.speakerEmails.length > 0) {
          for (const email of s.speakerEmails) {
            const userCheck = await pool.request()
              .input('Email', sql.VarChar(255), email.trim())
              .query(`SELECT UserID, Role FROM Users WHERE Email = @Email`);
            const speaker = userCheck.recordset[0];
            if (speaker && speaker.Role === 'Speaker') {
              await pool.request()
                .input('SessionID', sql.Int, newSessionId)
                .input('SpeakerID', sql.Int, speaker.UserID)
                .query(`IF NOT EXISTS (SELECT 1 FROM SessionSpeakers WHERE SessionID=@SessionID AND SpeakerID=@SpeakerID)
                        INSERT INTO SessionSpeakers (SessionID, SpeakerID) VALUES (@SessionID, @SpeakerID)`);
              await pool.request()
                .input('EventID', sql.Int, parseInt(eventId))
                .input('SpeakerID', sql.Int, speaker.UserID)
                .input('InvitedBy', sql.Int, req.user.UserID)
                .query(`IF NOT EXISTS (SELECT 1 FROM SpeakerInvitations WHERE EventID=@EventID AND SpeakerID=@SpeakerID)
                        INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status) VALUES (@EventID, @SpeakerID, @InvitedBy, 'Pending')`);
            }
          }
        }
      }
      
      // Send invitations to newly added speakers after edit
      const newSpeakers = await pool.request().input('EventID', sql.Int, eventId).query(`
          SELECT DISTINCT u.UserID 
          FROM SpeakerInvitations es
          JOIN Users u ON es.SpeakerID = u.UserID
          WHERE es.EventID = @EventID
      `);
      for (const speaker of newSpeakers.recordset) {
        await pool.request()
          .input('UserID', sql.Int, speaker.UserID)
          .input('Title', sql.NVarChar(300), 'Lời mời làm Diễn giả')
          .input('Message', sql.NVarChar(sql.MAX), `Bạn đã được mời làm diễn giả cho sự kiện "${event.Title}". Vui lòng xác nhận tham gia.`)
          .input('Type', sql.VarChar(30), 'SpeakerInvitation')
          .input('RelatedID', sql.Int, eventId)
          .input('RelatedType', sql.VarChar(50), 'Event')
          .query(`
            IF NOT EXISTS (SELECT 1 FROM Notifications WHERE UserID=@UserID AND Type='SpeakerInvitation' AND RelatedID=@RelatedID AND IsRead=0)
            INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)
          `);
      }
    }

    // Gửi thông báo cho Organizer
    await pool.request()
      .input('UserID', sql.Int, event.OrganizerID)
      .input('Title', sql.NVarChar(300), proposedChangesObj ? 'Chỉnh sửa sự kiện được duyệt' : 'Sự kiện đã được duyệt')
      .input('Message', sql.NVarChar(sql.MAX), proposedChangesObj 
        ? `Sự kiện "${event.Title}" của bạn đã được admin duyệt nội dung chỉnh sửa.`
        : `Sự kiện "${event.Title}" của bạn đã được admin duyệt và đang được hiển thị công khai.`)
      .input('Type', sql.VarChar(30), 'EventApproval')
      .input('RelatedID', sql.Int, eventId)
      .input('RelatedType', sql.VarChar(50), 'Event')
      .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);

    // Gửi thông báo mời Diễn giả (chỉ áp dụng nếu không phải là Edit Approval)
    if (!proposedChangesObj) {
      const speakers = await pool.request()
        .input('EventID', sql.Int, eventId)
        .query(`
          SELECT DISTINCT u.UserID 
          FROM SpeakerInvitations es
          JOIN Users u ON es.SpeakerID = u.UserID
          WHERE es.EventID = @EventID
        `);

      for (const speaker of speakers.recordset) {
        await pool.request()
          .input('UserID', sql.Int, speaker.UserID)
          .input('Title', sql.NVarChar(300), 'Lời mời làm Diễn giả')
          .input('Message', sql.NVarChar(sql.MAX), `Bạn đã được mời làm diễn giả cho sự kiện "${event.Title}". Vui lòng xác nhận tham gia.`)
          .input('Type', sql.VarChar(30), 'SpeakerInvitation')
          .input('RelatedID', sql.Int, eventId)
          .input('RelatedType', sql.VarChar(50), 'Event')
          .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);
      }
    } else {
      // NẾU LÀ DUYỆT CHỈNH SỬA -> Gửi thông báo thay đổi cho Participants, Speakers, Staffs
      const participants = await pool.request()
        .input('EventID', sql.Int, eventId)
        .query(`
          SELECT ParticipantID AS UserID FROM Registrations WHERE EventID = @EventID AND Status = 'Registered'
          UNION
          SELECT SpeakerID AS UserID FROM SpeakerInvitations WHERE EventID = @EventID AND Status = 'Accepted'
          UNION
          SELECT StaffID AS UserID FROM EventStaffs WHERE EventID = @EventID
        `);

      for (const p of participants.recordset) {
        await pool.request()
          .input('UserID', sql.Int, p.UserID)
          .input('Title', sql.NVarChar(300), `Sự kiện thay đổi: ${event.Title}`)
          .input('Message', sql.NVarChar(sql.MAX), `Sự kiện "${event.Title}" vừa có một số cập nhật. Lý do từ Ban tổ chức: ${currentEvent.EditReason}`)
          .input('Type', sql.VarChar(30), 'EventUpdate')
          .input('RelatedID', sql.Int, eventId)
          .input('RelatedType', sql.VarChar(50), 'Event')
          .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);
      }
    }

    return res.status(200).json({ success: true, message: 'Đã duyệt sự kiện thành công' });
  } catch (error) {
    console.error('Approve event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi duyệt sự kiện' });
  }
};

// ─── REJECT EVENT ────────────────────────────────────────────────
const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.UserID;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối' });
    }

    const pool = getPool();

    const eventCheck = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT ProposedChanges FROM Events WHERE EventID = @EventID`);
    const currentEvent = eventCheck.recordset[0];
    if (!currentEvent) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

    let updateQuery = `
      UPDATE Events 
      SET ApprovalStatus = 'Rejected', Status = 'Rejected', ApprovedBy = @AdminID, ApprovedAt = GETDATE(), RejectionReason = @Reason, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Title, INSERTED.OrganizerID
      WHERE EventID = @EventID
    `;

    // Nếu đây là từ chối bản CHỈNH SỬA của một sự kiện đã duyệt
    if (currentEvent.ProposedChanges) {
      updateQuery = `
        UPDATE Events 
        SET ApprovalStatus = 'Approved', ProposedChanges = NULL, EditReason = NULL, UpdatedAt = GETDATE()
        OUTPUT INSERTED.Title, INSERTED.OrganizerID
        WHERE EventID = @EventID
      `;
    }

    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('AdminID', sql.Int, adminId)
      .input('Reason', sql.NVarChar(500), reason)
      .query(updateQuery);

    const event = result.recordset[0];

    // Gửi thông báo cho Organizer
    await pool.request()
      .input('UserID', sql.Int, event.OrganizerID)
      .input('Title', sql.NVarChar(300), currentEvent.ProposedChanges ? 'Yêu cầu chỉnh sửa bị từ chối' : 'Sự kiện bị từ chối')
      .input('Message', sql.NVarChar(sql.MAX), currentEvent.ProposedChanges 
        ? `Yêu cầu chỉnh sửa sự kiện "${event.Title}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Sự kiện "${event.Title}" của bạn đã bị từ chối. Lý do: ${reason}`)
      .input('Type', sql.VarChar(30), 'EventApproval')
      .input('RelatedID', sql.Int, eventId)
      .input('RelatedType', sql.VarChar(50), 'Event')
      .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);

    return res.status(200).json({ success: true, message: currentEvent.ProposedChanges ? 'Đã từ chối chỉnh sửa' : 'Đã từ chối sự kiện' });
  } catch (error) {
    console.error('Reject event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi từ chối sự kiện' });
  }
};

// ─── CANCEL (LOCK) EVENT ─────────────────────────────────────────
const cancelEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do khóa sự kiện' });
    }

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

    const event = result.recordset[0];
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

    // Gửi thông báo
    await pool.request()
      .input('UserID', sql.Int, event.OrganizerID)
      .input('Title', sql.NVarChar(300), 'Sự kiện bị khóa')
      .input('Message', sql.NVarChar(sql.MAX), `Sự kiện "${event.Title}" của bạn đã bị khóa bởi Admin. Lý do: ${reason}`)
      .input('Type', sql.VarChar(30), 'EventUpdate')
      .input('RelatedID', sql.Int, eventId)
      .input('RelatedType', sql.VarChar(50), 'Event')
      .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);

    return res.status(200).json({ success: true, message: 'Đã khóa sự kiện thành công' });
  } catch (error) {
    console.error('Cancel event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi khóa sự kiện' });
  }
};

// ─── GET ALL USERS (USER MANAGEMENT) ─────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .query(`
        SELECT UserID, FullName, Email, Role, Phone, IsActive, IsVerified, CreatedAt, University
        FROM Users
        WHERE Role != 'Admin'
        ORDER BY CreatedAt DESC
      `);

    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
  }
};

// ─── UPDATE USER STATUS ──────────────────────────────────────────
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Trạng thái isActive phải là boolean' });
    }

    const pool = getPool();
    const userCheck = await pool.request().input('UserID', sql.Int, userId).query('SELECT Role FROM Users WHERE UserID = @UserID');
    if (userCheck.recordset.length > 0 && userCheck.recordset[0].Role === 'Admin') {
      return res.status(403).json({ success: false, message: 'Không thể thao tác trên tài khoản Admin' });
    }

    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('IsActive', sql.Bit, isActive)
      .query(`
        UPDATE Users SET IsActive = @IsActive, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    return res.status(200).json({ success: true, message: `Đã ${isActive ? 'kích hoạt' : 'vô hiệu hoá'} tài khoản thành công` });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái người dùng' });
  }
};

// ─── BROADCAST NOTIFICATION ──────────────────────────────────────
const broadcastNotification = async (req, res) => {
  try {
    const { title, message, audience } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung' });

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
    return res.status(200).json({ success: true, message: 'Đã gửi thông báo thành công' });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi thông báo' });
  }
};

// ─── GET ORGANIZER STATS ──────────────────────────────────────────
const getOrganizerStats = async (req, res) => {
  try {
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
        (SELECT COUNT(*) FROM Blogs WHERE AuthorID = u.UserID AND IsReported = 1) AS ReportedBlogsCount
      FROM Users u
      LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
      WHERE u.Role = 'Organizer'
    `);
    
    // Process results into Top and Risk
    const allOrgs = result.recordset.map(org => ({
      ...org,
      RiskScore: org.RejectedEvents * 2 + org.ReportedBlogsCount * 3,
      PerformanceScore: org.PublishedEvents * 10 + org.TotalParticipants
    }));

    const topOrganizers = [...allOrgs].sort((a, b) => b.PerformanceScore - a.PerformanceScore).slice(0, 10);
    const riskOrganizers = [...allOrgs].filter(o => o.RiskScore > 0).sort((a, b) => b.RiskScore - a.RiskScore);

    return res.status(200).json({ 
      success: true, 
      data: {
        topOrganizers,
        riskOrganizers
      }
    });
  } catch (error) {
    console.error('Get organizer stats error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu BTC' });
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
  getOrganizerStats
};
