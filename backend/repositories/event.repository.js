const { getPool, sql } = require('../config/db');

class EventRepository {
  async countEvents(whereClause, params) {
    const pool = getPool();
    const r = pool.request();
    params.forEach(p => r.input(p.name, p.type, p.value));
    const countResult = await r.query(`SELECT COUNT(*) AS Total FROM Events e WHERE ${whereClause}`);
    return countResult.recordset[0]?.Total || 0;
  }

  async findEvents(whereClause, params, orderCol, orderDir, offset, limit) {
    const pool = getPool();
    const r = pool.request();
    params.forEach(p => r.input(p.name, p.type, p.value));
    r.input('Offset', sql.Int, offset);
    r.input('Limit', sql.Int, limit);

    const result = await r.query(`
      SELECT
        e.EventID, e.Title, e.Description, e.CoverImageURL,
        e.StartDate, e.EndDate, e.RegistrationDeadline,
        e.MaxParticipants, e.IsInternalOnly, e.Status, e.ApprovalStatus,
        e.RejectionReason, e.ProposedChanges, e.EditReason, e.CreatedAt, e.UpdatedAt, e.DocumentsURL,
        u.UserID AS OrganizerID, u.FullName AS OrganizerName,
        op.OrganizationName, op.DocumentURL AS OrganizerDocs,
        c.CategoryID, c.Name AS CategoryName,
        v.VenueID, v.Name AS VenueName, v.Address AS VenueAddress,
        (SELECT ISNULL(AVG(CAST(Rating AS FLOAT)), 0) FROM Feedbacks f WHERE f.EventID = e.EventID) AS AverageRating,
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
    
    return result.recordset;
  }

  async findEventById(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT e.*,
          u.FullName AS OrganizerName, u.Email AS OrganizerEmail,
          op.OrganizationName, op.DocumentURL AS OrganizerDocs,
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
    return result.recordset[0];
  }

  async findEventSessions(eventId) {
    const pool = getPool();
    const sessionsQuery = await pool.request()
      .input('EventID', sql.Int, eventId)
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
    return sessionsQuery.recordset;
  }

  async checkIsStaff(eventId, staffId) {
    const pool = getPool();
    const staffCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query('SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');
    return staffCheck.recordset.length > 0;
  }

  async getOrganizerApprovalStatus(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT ApprovalStatus FROM OrganizerProfiles WHERE UserID = @UserID');
    return result.recordset[0]?.ApprovalStatus;
  }

  async checkVenueOverlap(venueId, startDate, endDate, excludeEventId = null) {
    const pool = getPool();
    const r = pool.request()
      .input('VenueID', sql.Int, venueId)
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate);
    
    let query = `
      SELECT Title FROM Events 
      WHERE VenueID = @VenueID 
        AND ApprovalStatus = 'Approved'
        AND (@StartDate < EndDate AND @EndDate > StartDate)
    `;
    if (excludeEventId) {
      r.input('EventID', sql.Int, excludeEventId);
      query += ` AND EventID != @EventID`;
    }
    const result = await r.query(query);
    return result.recordset;
  }

  // [Tạo sự kiện] Thực thi INSERT INTO Events -> Trả về EventID mới
  async createEvent(eventData) {
    const pool = getPool();
    const r = pool.request()
      .input('OrganizerID', sql.Int, eventData.organizerId)
      .input('CategoryID', sql.Int, eventData.categoryId || null)
      .input('VenueID', sql.Int, eventData.venueId || null)
      .input('Title', sql.NVarChar(300), eventData.title)
      .input('Description', sql.NVarChar(sql.MAX), eventData.description || null)
      .input('CoverImageURL', sql.VarChar(500), eventData.coverImageURL || null)
      .input('DocumentsURL', sql.NVarChar(sql.MAX), eventData.documentsURL || null)
      .input('StartDate', sql.DateTime, eventData.startDate)
      .input('EndDate', sql.DateTime, eventData.endDate)
      .input('RegistrationDeadline', sql.DateTime, eventData.registrationDeadline || null)
      .input('MaxParticipants', sql.Int, eventData.maxParticipants || null)
      .input('IsInternalOnly', sql.Bit, eventData.isInternalOnly);

    const result = await r.query(`
      INSERT INTO Events (OrganizerID,CategoryID,VenueID,Title,Description,CoverImageURL, DocumentsURL,
        StartDate,EndDate,RegistrationDeadline,MaxParticipants,IsInternalOnly,Status,ApprovalStatus)
      OUTPUT INSERTED.*
      VALUES (@OrganizerID,@CategoryID,@VenueID,@Title,@Description,@CoverImageURL, @DocumentsURL,
        @StartDate,@EndDate,@RegistrationDeadline,@MaxParticipants,@IsInternalOnly,'Draft','NotSubmitted')
    `);
    return result.recordset[0];
  }

  async createSession(sessionData) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, sessionData.eventId)
      .input('Title', sql.NVarChar(300), sessionData.title)
      .input('Description', sql.NVarChar(sql.MAX), sessionData.description || null)
      .input('StartTime', sql.DateTime, sessionData.startTime)
      .input('EndTime', sql.DateTime, sessionData.endTime)
      .input('Location', sql.NVarChar(300), sessionData.location || null)
      .query(`
        INSERT INTO Sessions (EventID,Title,Description,StartTime,EndTime,Location)
        OUTPUT INSERTED.SessionID
        VALUES (@EventID,@Title,@Description,@StartTime,@EndTime,@Location)
      `);
    return result.recordset[0].SessionID;
  }

  async findUserByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email.trim())
      .query(`SELECT UserID, Role, IsActive FROM Users WHERE Email = @Email`);
    return result.recordset[0];
  }

  async addSpeakerToSession(sessionId, speakerId, eventId, organizerId, prevStatus = 'Pending') {
    const pool = getPool();
    await pool.request()
      .input('SessionID', sql.Int, sessionId)
      .input('SpeakerID', sql.Int, speakerId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM SessionSpeakers WHERE SessionID=@SessionID AND SpeakerID=@SpeakerID)
        INSERT INTO SessionSpeakers (SessionID, SpeakerID) VALUES (@SessionID, @SpeakerID)
      `);
    
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('SpeakerID', sql.Int, speakerId)
      .input('InvitedBy', sql.Int, organizerId)
      .input('Status', sql.VarChar(20), prevStatus)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM SpeakerInvitations WHERE EventID=@EventID AND SpeakerID=@SpeakerID)
        INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status) VALUES (@EventID, @SpeakerID, @InvitedBy, @Status)
      `);
  }

  // [Cập nhật sự kiện] Thực thi UPDATE bảng Events
  async updateEvent(eventId, updateData) {
    const pool = getPool();
    const r = pool.request().input('EventID', sql.Int, eventId);
    
    let updateQueries = [];
    Object.keys(updateData).forEach(key => {
      r.input(key, updateData[key].type, updateData[key].value);
      updateQueries.push(`${key}=@${key}`);
    });
    
    if (updateQueries.length > 0) {
      await r.query(`UPDATE Events SET ${updateQueries.join(', ')}, UpdatedAt=GETDATE() WHERE EventID=@EventID`);
    }
  }

  async deleteEvent(eventId) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`DELETE FROM Events WHERE EventID = @EventID`);
  }

  async getSpeakerInvitations(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`SELECT SpeakerID, Status FROM SpeakerInvitations WHERE EventID=@EventID`);
    return result.recordset;
  }

  async clearEventSessionsAndSpeakers(eventId) {
    const pool = getPool();
    await pool.request().input('EventID', sql.Int, eventId)
      .query(`DELETE FROM SessionSpeakers WHERE SessionID IN (SELECT SessionID FROM Sessions WHERE EventID=@EventID)`);
    await pool.request().input('EventID', sql.Int, eventId)
      .query(`DELETE FROM SpeakerInvitations WHERE EventID=@EventID`);
    await pool.request().input('EventID', sql.Int, eventId)
      .query(`DELETE FROM Sessions WHERE EventID=@EventID`);
  }

  async getAdmins() {
    const pool = getPool();
    const result = await pool.request().query(`SELECT UserID FROM Users WHERE Role='Admin' AND IsActive=1`);
    return result.recordset;
  }

  async createNotification(data) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, data.userId)
      .input('Title', sql.NVarChar(300), data.title)
      .input('Message', sql.NVarChar(sql.MAX), data.message)
      .input('Type', sql.VarChar(30), data.type)
      .input('RelatedID', sql.Int, data.relatedId || null)
      .input('RelatedType', sql.VarChar(50), data.relatedType || null)
      .query(`
        INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) 
        VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)
      `);
  }

  async getEventRegistrations(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`SELECT ParticipantID FROM Registrations WHERE EventID=@EventID AND Status='Registered'`);
    return result.recordset;
  }

  async findSessionById(sessionId, eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('SessionID', sql.Int, sessionId)
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT s.SessionID, e.OrganizerID 
        FROM Sessions s JOIN Events e ON s.EventID=e.EventID 
        WHERE s.SessionID=@SessionID AND s.EventID=@EventID
      `);
    return result.recordset[0];
  }

  async updateSession(sessionId, data) {
    const pool = getPool();
    await pool.request()
      .input('SessionID', sql.Int, sessionId)
      .input('Title', sql.NVarChar(300), data.title)
      .input('Description', sql.NVarChar(sql.MAX), data.description || null)
      .input('StartTime', sql.DateTime, data.startTime)
      .input('EndTime', sql.DateTime, data.endTime)
      .input('Location', sql.NVarChar(300), data.location || null)
      .query(`
        UPDATE Sessions SET Title=@Title,Description=@Description,StartTime=@StartTime,EndTime=@EndTime,Location=@Location 
        WHERE SessionID=@SessionID
      `);
  }

  async deleteSession(sessionId) {
    const pool = getPool();
    await pool.request().input('SessionID', sql.Int, sessionId).query(`DELETE FROM Sessions WHERE SessionID=@SessionID`);
  }

  async unlockEventEdit(eventId) {
    const pool = getPool();
    await pool.request().input('EventID', sql.Int, eventId)
      .query(`UPDATE Events SET AdminEditUnlock=1, UpdatedAt=GETDATE() WHERE EventID=@EventID`);
  }

  async getCategories() {
    const pool = getPool();
    const result = await pool.request().query(`SELECT * FROM Categories WHERE IsActive=1 ORDER BY Name`);
    return result.recordset;
  }

  async getVenues() {
    const pool = getPool();
    const result = await pool.request().query(`SELECT * FROM Venues WHERE IsActive=1 ORDER BY Name`);
    return result.recordset;
  }

  async getDashboardStats(dateLimit, formatStr) {
    const pool = getPool();
    const stats = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Events) AS TotalEvents,
        (SELECT COUNT(*) FROM Events WHERE Status='Published' AND EndDate >= GETDATE()) AS PublishedEvents,
        (SELECT COUNT(*) FROM Events WHERE ApprovalStatus='Pending') AS PendingApproval,
        (SELECT COUNT(*) FROM Events WHERE Status='Completed' OR (Status='Published' AND EndDate < GETDATE())) AS CompletedEvents,
        (SELECT COUNT(*) FROM Users WHERE Role='Participant') AS TotalParticipants,
        (SELECT COUNT(*) FROM Users WHERE Role='Organizer') AS TotalOrganizers,
        (SELECT COUNT(*) FROM Users WHERE Role='Speaker') AS TotalSpeakers,
        (SELECT COUNT(*) FROM Registrations WHERE Status='Registered') AS TotalRegistrations,
        (SELECT COUNT(*) FROM Events WHERE StartDate>=GETDATE() AND Status='Published') AS UpcomingEvents
    `);
    const recentEvents = await pool.request().query(`
      SELECT TOP 5 e.EventID, e.Title, e.Status, e.ApprovalStatus, e.StartDate, e.EndDate, u.FullName AS OrganizerName
      FROM Events e JOIN Users u ON e.OrganizerID=u.UserID ORDER BY e.CreatedAt DESC
    `);
    const eventsChart = await pool.request().query(`
      SELECT FORMAT(CreatedAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Events WHERE CreatedAt >= ${dateLimit} GROUP BY FORMAT(CreatedAt, '${formatStr}') ORDER BY label
    `);
    const usersChart = await pool.request().query(`
      SELECT FORMAT(CreatedAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Users WHERE Role='Participant' AND CreatedAt >= ${dateLimit} GROUP BY FORMAT(CreatedAt, '${formatStr}') ORDER BY label
    `);
    const registrationsChart = await pool.request().query(`
      SELECT FORMAT(RegisteredAt, '${formatStr}') as label, COUNT(*) as value 
      FROM Registrations WHERE RegisteredAt >= ${dateLimit} GROUP BY FORMAT(RegisteredAt, '${formatStr}') ORDER BY label
    `);

    return {
      stats: stats.recordset[0],
      recentEvents: recentEvents.recordset,
      charts: {
        events: eventsChart.recordset,
        users: usersChart.recordset,
        registrations: registrationsChart.recordset
      }
    };
  }

  async getEventSpeakers(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT 
          u.UserID, u.FullName, u.Email, u.AvatarURL, u.Phone,
          si.Status as InvitationStatus, si.CreatedAt as InvitedAt,
          (SELECT STRING_AGG(s.Title, ', ') 
           FROM SessionSpeakers ss 
           JOIN Sessions s ON ss.SessionID = s.SessionID 
           WHERE ss.SpeakerID = u.UserID AND s.EventID = @EventID) AS AssignedSessions
        FROM SpeakerInvitations si
        JOIN Users u ON si.SpeakerID = u.UserID
        WHERE si.EventID = @EventID
      `);
    return result.recordset;
  }
}

module.exports = new EventRepository();
