const { getPool, sql } = require('../config/db');

class EventRepository {
  // ─── COUNT EVENTS ──────────────────────────────────────────────
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
        e.RejectionReason, e.ProposedChanges, e.EditReason, e.CreatedAt, e.UpdatedAt,
        u.UserID AS OrganizerID, u.FullName AS OrganizerName,
        op.OrganizationName,
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

  // ─── FIND EVENT BY ID ──────────────────────────────────────────────
async findEventById(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
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
}

module.exports = new EventRepository();
