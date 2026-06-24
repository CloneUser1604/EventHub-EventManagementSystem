const { getPool, sql } = require('../config/db');
const {
  successResponse, createdResponse, errorResponse,
  notFoundResponse, forbiddenResponse, conflictResponse,
} = require('../utils/response');

// ─── GET ALL EVENTS ───────────────────────────────────────────
const getEvents = async (req, res) => {
  try {
    const {
      page = 1, limit = 12,
      search, categoryId, venueId, status, approvalStatus,
      startDate, endDate, organizerId,
      sortBy = 'StartDate', sortOrder = 'ASC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pool   = getPool();
    const isAdmin     = req.user?.Role === 'Admin';
    const isOrganizer = req.user?.Role === 'Organizer';

    // Build WHERE conditions + params as arrays — apply to each request separately
    const conditions = [];
    const params = [];   // { name, type, value }

    // Role-based visibility
    if (isAdmin) {
      // Admin sees everything — optionally filter by status/approvalStatus
      if (status) {
        conditions.push(`e.Status = @Status`);
        params.push({ name: 'Status', type: sql.VarChar(20), value: status });
      }
      if (approvalStatus) {
        conditions.push(`e.ApprovalStatus = @ApprovalStatus`);
        params.push({ name: 'ApprovalStatus', type: sql.VarChar(20), value: approvalStatus });
      }
    } else if (isOrganizer) {
      params.push({ name: 'OrgID', type: sql.Int, value: req.user.UserID });
      conditions.push(`(e.Status = 'Published' OR e.OrganizerID = @OrgID)`);
    } else {
      conditions.push(`e.Status = 'Published'`);
    }

    if (search) {
      conditions.push(`(e.Title LIKE @Search OR e.Description LIKE @Search)`);
      params.push({ name: 'Search', type: sql.NVarChar, value: `%${search}%` });
    }
    if (categoryId) {
      conditions.push(`e.CategoryID = @CategoryID`);
      params.push({ name: 'CategoryID', type: sql.Int, value: parseInt(categoryId) });
    }
    if (venueId) {
      conditions.push(`e.VenueID = @VenueID`);
      params.push({ name: 'VenueID', type: sql.Int, value: parseInt(venueId) });
    }
    if (startDate) {
      conditions.push(`e.StartDate >= @StartDate`);
      params.push({ name: 'StartDate', type: sql.DateTime, value: new Date(startDate) });
    }
    if (endDate) {
      conditions.push(`e.EndDate <= @EndDate`);
      params.push({ name: 'EndDate', type: sql.DateTime, value: new Date(endDate) });
    }
    if (organizerId && (isAdmin || isOrganizer)) {
      conditions.push(`e.OrganizerID = @OrganizerID`);
      params.push({ name: 'OrganizerID', type: sql.Int, value: parseInt(organizerId) });
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    const validSortCols = { StartDate: 'e.StartDate', Title: 'e.Title', CreatedAt: 'e.CreatedAt' };
    const orderCol = validSortCols[sortBy] || 'e.StartDate';
    const orderDir = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    // Helper to build a fresh request with all params
    const buildRequest = () => {
      const r = pool.request();
      params.forEach(p => r.input(p.name, p.type, p.value));
      return r;
    };

    // Count
    const countResult = await buildRequest()
      .query(`SELECT COUNT(*) AS Total FROM Events e WHERE ${whereClause}`);
    const total = countResult.recordset[0]?.Total || 0;

    // Data
    const result = await buildRequest()
      .input('Offset', sql.Int, offset)
      .input('Limit',  sql.Int, parseInt(limit))
      .query(`
        SELECT
          e.EventID, e.Title, e.Description, e.CoverImageURL,
          e.StartDate, e.EndDate, e.RegistrationDeadline,
          e.MaxParticipants, e.Status, e.ApprovalStatus,
          e.RejectionReason, e.ProposedChanges, e.EditReason, e.CreatedAt, e.UpdatedAt,
          u.UserID AS OrganizerID, u.FullName AS OrganizerName,
          op.OrganizationName,
          c.CategoryID, c.Name AS CategoryName,
          v.VenueID, v.Name AS VenueName, v.Address AS VenueAddress,
          (SELECT COUNT(*) FROM Registrations r WHERE r.EventID = e.EventID AND r.Status = 'Registered') AS RegisteredCount,
          (SELECT COUNT(*) FROM Sessions s WHERE s.EventID = e.EventID) AS SessionCount
        FROM Events e
        INNER JOIN Users u ON e.OrganizerID = u.UserID
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        LEFT JOIN Categories c ON e.CategoryID = c.CategoryID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        WHERE ${whereClause}
        ORDER BY ${orderCol} ${orderDir}
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `);

    return successResponse(res, {
      events: result.recordset,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('getEvents error:', error.message);
    return errorResponse(res, 'Lấy danh sách sự kiện thất bại: ' + error.message);
  }
};

// ─── GET SINGLE EVENT ──────────────────────────────────────────
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('EventID', sql.Int, parseInt(id))
      .query(`
        SELECT e.*,
          u.FullName AS OrganizerName, u.Email AS OrganizerEmail,
          op.OrganizationName,
          c.Name AS CategoryName, c.IconURL AS CategoryIcon,
          v.Name AS VenueName, v.Address AS VenueAddress,
          v.Capacity AS VenueCapacity, v.MapURL,
          approver.FullName AS ApprovedByName,
          (SELECT COUNT(*) FROM Registrations r WHERE r.EventID = e.EventID AND r.Status = 'Registered') AS RegisteredCount
        FROM Events e
        INNER JOIN Users u ON e.OrganizerID = u.UserID
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        LEFT JOIN Categories c ON e.CategoryID = c.CategoryID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        LEFT JOIN Users approver ON e.ApprovedBy = approver.UserID
        WHERE e.EventID = @EventID
      `);

    const event = result.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');

    const isOwner = req.user?.UserID === event.OrganizerID;
    const isAdmin = req.user?.Role === 'Admin';
    if (!isAdmin && !isOwner && event.Status !== 'Published') {
      return notFoundResponse(res, 'Không tìm thấy sự kiện');
    }

    const sessionsQuery = await pool.request()
      .input('EventID', sql.Int, parseInt(id))
      .query(`
        SELECT s.*,
          (SELECT STRING_AGG(u.FullName, ', ')
           FROM SessionSpeakers ss 
           JOIN Users u ON ss.SpeakerID = u.UserID
           JOIN SpeakerInvitations si ON u.UserID = si.SpeakerID AND si.EventID = s.EventID
           WHERE ss.SessionID = s.SessionID AND si.Status = 'Accepted') AS Speakers,
          (SELECT STRING_AGG(u.Email, ',')
           FROM SessionSpeakers ss 
           JOIN Users u ON ss.SpeakerID = u.UserID
           JOIN SpeakerInvitations si ON u.UserID = si.SpeakerID AND si.EventID = s.EventID
           WHERE ss.SessionID = s.SessionID AND si.Status = 'Accepted') AS speakerEmailsStr
        FROM Sessions s WHERE s.EventID = @EventID ORDER BY s.StartTime
      `);

    const sessions = sessionsQuery.recordset.map(s => {
      s.speakerEmails = s.speakerEmailsStr ? s.speakerEmailsStr.split(',') : [];
      delete s.speakerEmailsStr;
      return s;
    });



    let isStaff = false;
    if (req.user) {
      const staffCheck = await pool.request()
        .input('EventID', sql.Int, parseInt(id))
        .input('StaffID', sql.Int, req.user.UserID)
        .query('SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');
      if (staffCheck.recordset.length > 0) isStaff = true;
    }

    return successResponse(res, { ...event, sessions: sessions, isStaff });
  } catch (error) {
    console.error('getEventById error:', error.message);
    return errorResponse(res, 'Lấy thông tin sự kiện thất bại');
  }
};

// ─── CREATE EVENT ──────────────────────────────────────────────
const createEvent = async (req, res) => {
  try {
    const { title, description, startDate, endDate,
            registrationDeadline, maxParticipants, categoryId, venueId, sessions = [], isInternalOnly } = req.body;
    const pool = getPool();
    const organizerId = req.user.UserID;

    let parsedSessions = [];
    if (typeof sessions === 'string') {
      try { parsedSessions = JSON.parse(sessions); } catch (e) {}
    } else if (Array.isArray(sessions)) {
      parsedSessions = sessions;
    }

    if (req.user.Role === 'Organizer') {
      const orgCheck = await pool.request().input('UserID', sql.Int, organizerId)
        .query(`SELECT ApprovalStatus FROM OrganizerProfiles WHERE UserID = @UserID`);
      if (!orgCheck.recordset[0] || orgCheck.recordset[0].ApprovalStatus !== 'Approved') {
        return forbiddenResponse(res, 'Tài khoản ban tổ chức chưa được Admin phê duyệt.');
      }
    }

    let coverImageURL = null;
    let documentsURL = null;

    if (req.files && req.files['coverImage'] && req.files['coverImage'].length > 0) {
      coverImageURL = req.files['coverImage'][0].filename;
    }
    
    if (req.files && req.files['documents'] && req.files['documents'].length > 0) {
      const paths = req.files['documents'].map(f => f.filename);
      documentsURL = JSON.stringify(paths);
    } else {
      return errorResponse(res, 'Tài liệu/Giấy phép sự kiện là bắt buộc', 400);
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (eDate <= sDate) {
      return errorResponse(res, 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu', 400);
    }
    const rDate = registrationDeadline ? new Date(registrationDeadline) : null;
    if (rDate) {
      const oneDayBeforeStart = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
      if (rDate > oneDayBeforeStart) {
        return errorResponse(res, 'Hạn đăng ký phải kết thúc ít nhất 1 ngày trước khi sự kiện bắt đầu', 400);
      }
    }

    const insertResult = await pool.request()
      .input('OrganizerID', sql.Int, organizerId)
      .input('CategoryID', sql.Int, categoryId || null)
      .input('VenueID', sql.Int, venueId || null)
      .input('Title', sql.NVarChar(300), title)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('CoverImageURL', sql.VarChar(500), coverImageURL || null)
      .input('DocumentsURL', sql.NVarChar(sql.MAX), documentsURL || null)
      .input('StartDate', sql.DateTime, new Date(startDate))
      .input('EndDate', sql.DateTime, new Date(endDate))
      .input('RegistrationDeadline', sql.DateTime, registrationDeadline ? new Date(registrationDeadline) : null)
      .input('MaxParticipants', sql.Int, maxParticipants || null)
      .input('IsInternalOnly', sql.Bit, isInternalOnly === true || isInternalOnly === 'true' ? 1 : 0)
      .query(`
        INSERT INTO Events (OrganizerID,CategoryID,VenueID,Title,Description,CoverImageURL, DocumentsURL,
          StartDate,EndDate,RegistrationDeadline,MaxParticipants,IsInternalOnly,Status,ApprovalStatus)
        OUTPUT INSERTED.*
        VALUES (@OrganizerID,@CategoryID,@VenueID,@Title,@Description,@CoverImageURL, @DocumentsURL,
          @StartDate,@EndDate,@RegistrationDeadline,@MaxParticipants,@IsInternalOnly,'Draft','NotSubmitted')
      `);

    const newEvent = insertResult.recordset[0];

    for (const s of parsedSessions) {
      const sessionResult = await pool.request()
        .input('EventID', sql.Int, newEvent.EventID)
        .input('Title', sql.NVarChar(300), s.title)
        .input('Description', sql.NVarChar(sql.MAX), s.description || null)
        .input('StartTime', sql.DateTime, new Date(s.startTime))
        .input('EndTime', sql.DateTime, new Date(s.endTime))
        .input('Location', sql.NVarChar(300), s.location || null)
        .query(`INSERT INTO Sessions (EventID,Title,Description,StartTime,EndTime,Location)
                OUTPUT INSERTED.SessionID
                VALUES (@EventID,@Title,@Description,@StartTime,@EndTime,@Location)`);
                
      const newSessionId = sessionResult.recordset[0].SessionID;

      // Xử lý thêm Speaker vào Session
      if (s.speakerEmails && Array.isArray(s.speakerEmails) && s.speakerEmails.length > 0) {
        for (const email of s.speakerEmails) {
          const userCheck = await pool.request()
            .input('Email', sql.VarChar(255), email.trim())
            .query(`SELECT UserID, Role, IsActive FROM Users WHERE Email = @Email`);
          const speaker = userCheck.recordset[0];
          // Nếu tồn tại User, có Role='Speaker', và IsActive=1 (hoặc do Organizer vừa tạo đang Pending) thì map vào
          if (speaker && speaker.Role === 'Speaker') {
            // Thêm vào SessionSpeakers
            await pool.request()
              .input('SessionID', sql.Int, newSessionId)
              .input('SpeakerID', sql.Int, speaker.UserID)
              .query(`IF NOT EXISTS (SELECT 1 FROM SessionSpeakers WHERE SessionID=@SessionID AND SpeakerID=@SpeakerID)
                      INSERT INTO SessionSpeakers (SessionID, SpeakerID) VALUES (@SessionID, @SpeakerID)`);
            
            // Thêm vào SpeakerInvitations
            await pool.request()
              .input('EventID', sql.Int, newEvent.EventID)
              .input('SpeakerID', sql.Int, speaker.UserID)
              .input('InvitedBy', sql.Int, newEvent.OrganizerID)
              .query(`IF NOT EXISTS (SELECT 1 FROM SpeakerInvitations WHERE EventID=@EventID AND SpeakerID=@SpeakerID)
                      INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status) VALUES (@EventID, @SpeakerID, @InvitedBy, 'Pending')`);
          }
        }
      }
    }

    return createdResponse(res, { eventId: newEvent.EventID }, 'Tạo sự kiện thành công');
  } catch (error) {
    console.error('createEvent error:', error.message);
    return errorResponse(res, 'Tạo sự kiện thất bại');
  }
};

// ─── UPDATE EVENT ──────────────────────────────────────────────
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const existing = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT * FROM Events WHERE EventID = @EventID`);
    const event = existing.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');

    const isOwner = req.user.UserID === event.OrganizerID;
    const isAdmin = req.user.Role === 'Admin';
    if (!isOwner && !isAdmin) return forbiddenResponse(res);
    if (!isAdmin && event.EditLockedAt && !event.AdminEditUnlock)
      return forbiddenResponse(res, 'Sự kiện đã bị khoá chỉnh sửa. Liên hệ Admin.');
    if (['Cancelled','Completed'].includes(event.Status) && !isAdmin)
      return forbiddenResponse(res, 'Không thể chỉnh sửa sự kiện đã kết thúc/huỷ');

    const { title, description, startDate, endDate,
            registrationDeadline, maxParticipants, categoryId, venueId, editReason, sessions, isInternalOnly } = req.body;

    const sDate = startDate ? new Date(startDate) : new Date(event.StartDate);
    const eDate = endDate ? new Date(endDate) : new Date(event.EndDate);
    if (eDate <= sDate) {
      return errorResponse(res, 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu', 400);
    }
    const rDateString = registrationDeadline !== undefined ? registrationDeadline : event.RegistrationDeadline;
    const rDate = rDateString ? new Date(rDateString) : null;
    if (rDate) {
      const oneDayBeforeStart = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
      if (rDate > oneDayBeforeStart) {
        return errorResponse(res, 'Hạn đăng ký phải kết thúc ít nhất 1 ngày trước khi sự kiện bắt đầu', 400);
      }
    }
    let { coverImageURL } = req.body;

    let parsedSessions = [];
    if (typeof sessions === 'string') {
      try { parsedSessions = JSON.parse(sessions); } catch (e) {}
    } else if (Array.isArray(sessions)) {
      parsedSessions = sessions;
    }

    if (req.files && req.files['coverImage'] && req.files['coverImage'].length > 0) {
      coverImageURL = req.files['coverImage'][0].filename;
    }

    const createdAt = new Date(event.CreatedAt);
    const editLockedAt = (!event.EditLockedAt && new Date() > new Date(createdAt.getTime() + 3*24*60*60*1000))
      ? new Date() : event.EditLockedAt;

    if (!isAdmin && event.Status === 'Published') {
      if (new Date(event.StartDate) <= new Date()) {
        return forbiddenResponse(res, 'Không thể chỉnh sửa sự kiện đã hoặc đang diễn ra');
      }
      if (!editReason) {
        return errorResponse(res, 'Vui lòng cung cấp lý do chỉnh sửa', 400);
      }
      
      const proposedChanges = JSON.stringify({
        title: title || event.Title, 
        description: description !== undefined ? description : event.Description, 
        coverImageURL: coverImageURL !== undefined ? coverImageURL : event.CoverImageURL, 
        startDate: startDate ? new Date(startDate).toISOString() : event.StartDate, 
        endDate: endDate ? new Date(endDate).toISOString() : event.EndDate, 
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : event.RegistrationDeadline, 
        maxParticipants: maxParticipants !== undefined ? maxParticipants : event.MaxParticipants, 
        categoryId: categoryId !== undefined ? categoryId : event.CategoryID, 
        venueId: venueId !== undefined ? venueId : event.VenueID,
        isInternalOnly: isInternalOnly !== undefined ? (isInternalOnly === true || isInternalOnly === 'true' ? 1 : 0) : event.IsInternalOnly,
        sessions: parsedSessions.length > 0 ? parsedSessions : undefined
      });

      await pool.request()
        .input('EventID', sql.Int, parseInt(id))
        .input('ProposedChanges', sql.NVarChar(sql.MAX), proposedChanges)
        .input('EditReason', sql.NVarChar(sql.MAX), editReason)
        .input('ApprovalStatus', sql.VarChar(50), 'Pending')
        .query(`
          UPDATE Events 
          SET ProposedChanges=@ProposedChanges, EditReason=@EditReason, ApprovalStatus=@ApprovalStatus, UpdatedAt=GETDATE()
          WHERE EventID=@EventID
        `);
        
      const admins = await pool.request().query(`SELECT UserID FROM Users WHERE Role='Admin' AND IsActive=1`);
      for (const admin of admins.recordset) {
        await pool.request()
          .input('UserID', sql.Int, admin.UserID)
          .input('Title', sql.NVarChar(300), `Yêu cầu chỉnh sửa sự kiện: ${event.Title}`)
          .input('Message', sql.NVarChar(sql.MAX), `Ban tổ chức sự kiện "${event.Title}" vừa gửi yêu cầu chỉnh sửa. Lý do chỉnh sửa: ${editReason}`)
          .input('Type', sql.VarChar(30), 'EventApproval')
          .input('RelatedID', sql.Int, parseInt(id))
          .input('RelatedType', sql.VarChar(50), 'Event')
          .query(`INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)`);
      }
      
      return successResponse(res, null, 'Đã gửi yêu cầu chỉnh sửa cho Admin phê duyệt');
    }

    await pool.request()
      .input('EventID', sql.Int, parseInt(id))
      .input('CategoryID', sql.Int, categoryId !== undefined ? categoryId : event.CategoryID)
      .input('VenueID', sql.Int, venueId !== undefined ? venueId : event.VenueID)
      .input('Title', sql.NVarChar(300), title || event.Title)
      .input('Description', sql.NVarChar(sql.MAX), description !== undefined ? description : event.Description)
      .input('CoverImageURL', sql.VarChar(500), coverImageURL !== undefined ? coverImageURL : event.CoverImageURL)
      .input('StartDate', sql.DateTime, startDate ? new Date(startDate) : event.StartDate)
      .input('EndDate', sql.DateTime, endDate ? new Date(endDate) : event.EndDate)
      .input('RegistrationDeadline', sql.DateTime, registrationDeadline ? new Date(registrationDeadline) : event.RegistrationDeadline)
      .input('MaxParticipants', sql.Int, maxParticipants !== undefined ? maxParticipants : event.MaxParticipants)
      .input('IsInternalOnly', sql.Bit, isInternalOnly !== undefined ? (isInternalOnly === true || isInternalOnly === 'true' ? 1 : 0) : event.IsInternalOnly)
      .input('EditLockedAt', sql.DateTime, editLockedAt || null)
      .query(`
        UPDATE Events SET CategoryID=@CategoryID, VenueID=@VenueID, Title=@Title,
          Description=@Description, CoverImageURL=@CoverImageURL, StartDate=@StartDate,
          EndDate=@EndDate, RegistrationDeadline=@RegistrationDeadline,
          MaxParticipants=@MaxParticipants, IsInternalOnly=@IsInternalOnly, EditLockedAt=@EditLockedAt, UpdatedAt=GETDATE()
        WHERE EventID=@EventID
      `);

    // Cập nhật sessions cho Draft
    if (parsedSessions.length > 0) {
      // Lưu trạng thái SpeakerInvitations cũ
      const oldInvs = await pool.request().input('EventID', sql.Int, parseInt(id)).query(`SELECT SpeakerID, Status FROM SpeakerInvitations WHERE EventID=@EventID`);
      const oldInvMap = {};
      oldInvs.recordset.forEach(i => oldInvMap[i.SpeakerID] = i.Status);

      // Xoá tất cả session cũ và liên kết
      await pool.request().input('EventID', sql.Int, parseInt(id)).query(`DELETE FROM SessionSpeakers WHERE SessionID IN (SELECT SessionID FROM Sessions WHERE EventID=@EventID)`);
      await pool.request().input('EventID', sql.Int, parseInt(id)).query(`DELETE FROM SpeakerInvitations WHERE EventID=@EventID`);
      await pool.request().input('EventID', sql.Int, parseInt(id)).query(`DELETE FROM Sessions WHERE EventID=@EventID`);

      for (const s of parsedSessions) {
        const sessionResult = await pool.request()
          .input('EventID', sql.Int, parseInt(id))
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
              const prevStatus = oldInvMap[speaker.UserID] || 'Pending';
              await pool.request()
                .input('EventID', sql.Int, parseInt(id))
                .input('SpeakerID', sql.Int, speaker.UserID)
                .input('InvitedBy', sql.Int, req.user.UserID)
                .input('Status', sql.VarChar(20), prevStatus)
                .query(`IF NOT EXISTS (SELECT 1 FROM SpeakerInvitations WHERE EventID=@EventID AND SpeakerID=@SpeakerID)
                        INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status) VALUES (@EventID, @SpeakerID, @InvitedBy, @Status)`);
            }
          }
        }
      }
    }

    return successResponse(res, null, 'Cập nhật sự kiện thành công');
  } catch (error) {
    console.error('updateEvent error:', error.message);
    return errorResponse(res, 'Cập nhật sự kiện thất bại');
  }
};

// ─── DELETE EVENT ──────────────────────────────────────────────
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const existing = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT OrganizerID, Status FROM Events WHERE EventID = @EventID`);
    const event = existing.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    const isOwner = req.user.UserID === event.OrganizerID;
    const isAdmin = req.user.Role === 'Admin';
    if (!isOwner && !isAdmin) return forbiddenResponse(res);
    if (!['Draft','Rejected'].includes(event.Status) && !isAdmin)
      return forbiddenResponse(res, 'Chỉ xoá được sự kiện ở trạng thái Nháp hoặc Bị từ chối');
    await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`DELETE FROM Events WHERE EventID = @EventID`);
    return successResponse(res, null, 'Xoá sự kiện thành công');
  } catch (error) {
    return errorResponse(res, 'Xoá sự kiện thất bại');
  }
};

// ─── SUBMIT FOR APPROVAL ───────────────────────────────────────
const submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const existing = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT OrganizerID, ApprovalStatus, Title FROM Events WHERE EventID = @EventID`);
    const event = existing.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    if (event.OrganizerID !== req.user.UserID) return forbiddenResponse(res);
    if (event.ApprovalStatus === 'Pending') return conflictResponse(res, 'Sự kiện đã được gửi duyệt, vui lòng chờ Admin');
    if (event.ApprovalStatus === 'Approved') return conflictResponse(res, 'Sự kiện đã được duyệt');

    await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`UPDATE Events SET ApprovalStatus='Pending', Status='PendingApproval', UpdatedAt=GETDATE() WHERE EventID=@EventID`);

    const admins = await pool.request().query(`SELECT UserID FROM Users WHERE Role='Admin' AND IsActive=1`);
    for (const admin of admins.recordset) {
      await pool.request()
        .input('UserID', sql.Int, admin.UserID)
        .input('Title', sql.NVarChar(300), `Sự kiện mới cần duyệt`)
        .input('Message', sql.NVarChar(sql.MAX), `Sự kiện "${event.Title}" đang chờ phê duyệt`)
        .input('Type', sql.VarChar(30), 'EventApproval')
        .input('RelatedID', sql.Int, parseInt(id))
        .input('RelatedType', sql.VarChar(50), 'Event')
        .query(`INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)`);
    }
    return successResponse(res, null, 'Đã gửi yêu cầu duyệt sự kiện');
  } catch (error) {
    console.error('submitForApproval error:', error.message);
    return errorResponse(res, 'Gửi duyệt thất bại');
  }
};


// ─── CANCEL EVENT ──────────────────────────────────────────────
const cancelEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const pool = getPool();
    const existing = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT OrganizerID, Status, Title FROM Events WHERE EventID=@EventID`);
    const event = existing.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    const isOwner = req.user.UserID === event.OrganizerID;
    const isAdmin = req.user.Role === 'Admin';
    if (!isOwner && !isAdmin) return forbiddenResponse(res);
    if (['Completed','Cancelled'].includes(event.Status)) return conflictResponse(res, 'Sự kiện đã kết thúc hoặc đã huỷ');

    await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`UPDATE Events SET Status='Cancelled', UpdatedAt=GETDATE() WHERE EventID=@EventID`);

    const regs = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT ParticipantID FROM Registrations WHERE EventID=@EventID AND Status='Registered'`);
    for (const reg of regs.recordset) {
      await pool.request()
        .input('UserID', sql.Int, reg.ParticipantID)
        .input('Title', sql.NVarChar(300), '⚠️ Sự kiện đã bị huỷ')
        .input('Message', sql.NVarChar(sql.MAX), `Sự kiện "${event.Title}" đã bị huỷ.${reason ? ' Lý do: '+reason : ''}`)
        .input('Type', sql.VarChar(30), 'General')
        .input('RelatedID', sql.Int, parseInt(id))
        .input('RelatedType', sql.VarChar(50), 'Event')
        .query(`INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)`);
    }
    return successResponse(res, null, 'Đã huỷ sự kiện');
  } catch (error) {
    return errorResponse(res, 'Huỷ sự kiện thất bại');
  }
};

// ─── SESSIONS ──────────────────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().input('EventID', sql.Int, parseInt(req.params.id))
      .query(`SELECT s.*, (SELECT STRING_AGG(u.FullName,', ') FROM SessionSpeakers ss JOIN Users u ON ss.SpeakerID=u.UserID WHERE ss.SessionID=s.SessionID) AS Speakers FROM Sessions s WHERE s.EventID=@EventID ORDER BY s.StartTime`);
    return successResponse(res, result.recordset);
  } catch (e) { return errorResponse(res, 'Lấy sessions thất bại'); }
};

const addSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, location } = req.body;
    const pool = getPool();
    const event = await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`SELECT OrganizerID FROM Events WHERE EventID=@EventID`);
    if (!event.recordset[0]) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    if (event.recordset[0].OrganizerID !== req.user.UserID && req.user.Role !== 'Admin') return forbiddenResponse(res);
    const result = await pool.request()
      .input('EventID', sql.Int, parseInt(id)).input('Title', sql.NVarChar(300), title)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('StartTime', sql.DateTime, new Date(startTime)).input('EndTime', sql.DateTime, new Date(endTime))
      .input('Location', sql.NVarChar(300), location || null)
      .query(`INSERT INTO Sessions (EventID,Title,Description,StartTime,EndTime,Location) OUTPUT INSERTED.* VALUES (@EventID,@Title,@Description,@StartTime,@EndTime,@Location)`);
    return createdResponse(res, result.recordset[0], 'Thêm phiên thành công');
  } catch (e) { return errorResponse(res, 'Thêm phiên thất bại'); }
};

const updateSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const { title, description, startTime, endTime, location } = req.body;
    const pool = getPool();
    const check = await pool.request().input('SessionID', sql.Int, parseInt(sessionId)).input('EventID', sql.Int, parseInt(id))
      .query(`SELECT s.SessionID, e.OrganizerID FROM Sessions s JOIN Events e ON s.EventID=e.EventID WHERE s.SessionID=@SessionID AND s.EventID=@EventID`);
    if (!check.recordset[0]) return notFoundResponse(res, 'Không tìm thấy phiên');
    if (check.recordset[0].OrganizerID !== req.user.UserID && req.user.Role !== 'Admin') return forbiddenResponse(res);
    await pool.request().input('SessionID', sql.Int, parseInt(sessionId))
      .input('Title', sql.NVarChar(300), title).input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('StartTime', sql.DateTime, new Date(startTime)).input('EndTime', sql.DateTime, new Date(endTime))
      .input('Location', sql.NVarChar(300), location || null)
      .query(`UPDATE Sessions SET Title=@Title,Description=@Description,StartTime=@StartTime,EndTime=@EndTime,Location=@Location WHERE SessionID=@SessionID`);
    return successResponse(res, null, 'Cập nhật phiên thành công');
  } catch (e) { return errorResponse(res, 'Cập nhật phiên thất bại'); }
};

const deleteSession = async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const pool = getPool();
    const check = await pool.request().input('SessionID', sql.Int, parseInt(sessionId)).input('EventID', sql.Int, parseInt(id))
      .query(`SELECT s.SessionID, e.OrganizerID FROM Sessions s JOIN Events e ON s.EventID=e.EventID WHERE s.SessionID=@SessionID AND s.EventID=@EventID`);
    if (!check.recordset[0]) return notFoundResponse(res, 'Không tìm thấy phiên');
    if (check.recordset[0].OrganizerID !== req.user.UserID && req.user.Role !== 'Admin') return forbiddenResponse(res);
    await pool.request().input('SessionID', sql.Int, parseInt(sessionId)).query(`DELETE FROM Sessions WHERE SessionID=@SessionID`);
    return successResponse(res, null, 'Xoá phiên thành công');
  } catch (e) { return errorResponse(res, 'Xoá phiên thất bại'); }
};

const unlockEventEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request().input('EventID', sql.Int, parseInt(id))
      .query(`UPDATE Events SET AdminEditUnlock=1, UpdatedAt=GETDATE() WHERE EventID=@EventID`);
    return successResponse(res, null, 'Đã mở khoá chỉnh sửa sự kiện');
  } catch (e) { return errorResponse(res, 'Mở khoá thất bại'); }
};

const getCategories = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`SELECT * FROM Categories WHERE IsActive=1 ORDER BY Name`);
    return successResponse(res, result.recordset);
  } catch (e) { return errorResponse(res, 'Lấy danh mục thất bại'); }
};

const getVenues = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`SELECT * FROM Venues WHERE IsActive=1 ORDER BY Name`);
    return successResponse(res, result.recordset);
  } catch (e) { return errorResponse(res, 'Lấy địa điểm thất bại'); }
};

const getDashboardStats = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query; 
    const formatStr = timeRange === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM';
    const dateLimit = timeRange === 'day' ? 'DATEADD(day, -30, GETDATE())' : 'DATEADD(month, -6, GETDATE())';

    const pool = getPool();
    const stats = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Events) AS TotalEvents,
        (SELECT COUNT(*) FROM Events WHERE Status='Published') AS PublishedEvents,
        (SELECT COUNT(*) FROM Events WHERE ApprovalStatus='Pending') AS PendingApproval,
        (SELECT COUNT(*) FROM Events WHERE Status='Completed') AS CompletedEvents,
        (SELECT COUNT(*) FROM Users WHERE Role='Participant') AS TotalParticipants,
        (SELECT COUNT(*) FROM Users WHERE Role='Organizer') AS TotalOrganizers,
        (SELECT COUNT(*) FROM Registrations WHERE Status='Registered') AS TotalRegistrations,
        (SELECT COUNT(*) FROM Events WHERE StartDate>=GETDATE() AND Status='Published') AS UpcomingEvents
    `);
    const recentEvents = await pool.request().query(`
      SELECT TOP 5 e.EventID, e.Title, e.Status, e.ApprovalStatus, e.StartDate, u.FullName AS OrganizerName
      FROM Events e JOIN Users u ON e.OrganizerID=u.UserID ORDER BY e.CreatedAt DESC
    `);

    // Chart Data
    const eventsChart = await pool.request().query(`
      SELECT FORMAT(CreatedAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Events 
      WHERE CreatedAt >= ${dateLimit}
      GROUP BY FORMAT(CreatedAt, '${formatStr}') ORDER BY label
    `);
    const usersChart = await pool.request().query(`
      SELECT FORMAT(CreatedAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Users 
      WHERE Role='Participant' AND CreatedAt >= ${dateLimit}
      GROUP BY FORMAT(CreatedAt, '${formatStr}') ORDER BY label
    `);
    const registrationsChart = await pool.request().query(`
      SELECT FORMAT(RegisteredAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Registrations 
      WHERE RegisteredAt >= ${dateLimit}
      GROUP BY FORMAT(RegisteredAt, '${formatStr}') ORDER BY label
    `);

    return successResponse(res, { 
      stats: stats.recordset[0], 
      recentEvents: recentEvents.recordset,
      charts: {
        events: eventsChart.recordset,
        users: usersChart.recordset,
        registrations: registrationsChart.recordset
      }
    });
  } catch (e) {
    console.error('getDashboardStats error:', e.message);
    return errorResponse(res, 'Lấy thống kê thất bại');
  }
};

module.exports = {
  getEvents, getEventById, createEvent, updateEvent, deleteEvent,
  submitForApproval,
  cancelEvent,
  getSessions, addSession, updateSession, deleteSession,
  unlockEventEdit, getCategories, getVenues, getDashboardStats,
};
