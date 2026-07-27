const { getPool, sql } = require('../config/db');

class StaffRepository {
  async checkStaffAccess(eventId, staffId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query("SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID");
    return result.recordset.length > 0;
  }

  async getEventParticipants(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT r.RegistrationID, r.ParticipantID, u.FullName, u.Email, u.Role, r.Status, 
               CASE WHEN es.EventStaffID IS NOT NULL THEN 'Assigned' ELSE NULL END AS InviteStatus, 
               a.Status AS AttendanceStatus
        FROM Registrations r
        JOIN Users u ON r.ParticipantID = u.UserID
        LEFT JOIN EventStaffs es ON r.EventID = es.EventID AND r.ParticipantID = es.StaffID
        LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
        WHERE r.EventID = @EventID AND r.Status = 'Registered'
      `);
    return result.recordset;
  }

  async getAvailableStaff(eventId = null) {
    const pool = getPool();
    const request = pool.request();
    
    let query = `
      SELECT UserID, FullName, Email, Role, Phone, IsActive, CreatedAt
      FROM Users
      WHERE Role = 'Staff'
    `;

    if (eventId) {
      request.input('EventID', sql.Int, eventId);
      query += `
        AND UserID NOT IN (
          SELECT es.StaffID
          FROM EventStaffs es
          JOIN Events e ON es.EventID = e.EventID
          WHERE e.Status NOT IN ('Cancelled', 'Completed')
          AND e.EventID != @EventID
          AND EXISTS (
            SELECT 1 FROM Events targetE
            WHERE targetE.EventID = @EventID
            AND e.StartDate < targetE.EndDate
            AND e.EndDate > targetE.StartDate
          )
        )
      `;
    }

    const result = await request.query(query);
    return result.recordset;
  }

  async findUserByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT 1 FROM Users WHERE Email = @Email');
    return result.recordset.length > 0;
  }

  async createStaff(data) {
    const pool = getPool();
    await pool.request()
      .input('FullName', sql.NVarChar(255), data.fullName)
      .input('Email', sql.VarChar(255), data.email)
      .input('PasswordHash', sql.VarChar(255), data.passwordHash)
      .input('Role', sql.VarChar(50), data.role)
      .input('Phone', sql.VarChar(20), data.phone)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsVerified, IsActive)
        VALUES (@FullName, @Email, @PasswordHash, @Role, @Phone, 1, 1)
      `);
  }

  async updateStaff(staffId, data) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, staffId)
      .input('FullName', sql.NVarChar(255), data.fullName)
      .input('Phone', sql.VarChar(20), data.phone)
      .input('Role', sql.VarChar(50), data.role)
      .input('IsActive', sql.Bit, data.isActive)
      .query(`
        UPDATE Users 
        SET FullName = @FullName, Phone = @Phone, Role = @Role, IsActive = @IsActive
        WHERE UserID = @UserID
      `);
  }

  async deleteStaff(staffId) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, staffId)
      .query('UPDATE Users SET IsActive = 0 WHERE UserID = @UserID');
  }

  async getAssignedStaff(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT es.EventStaffID, es.StaffID, u.FullName, u.Email, u.Role, u.Phone, es.AssignedAt
        FROM EventStaffs es
        JOIN Users u ON es.StaffID = u.UserID
        WHERE es.EventID = @EventID AND u.Role = 'Staff'
      `);
    return result.recordset;
  }

  async getEventById(eventId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query('SELECT StartDate, EndDate, Title FROM Events WHERE EventID = @EventID');
    return result.recordset[0];
  }

  async checkOverlap(staffId, eventId, startDate, endDate) {
    const pool = getPool();
    const result = await pool.request()
      .input('StaffID', sql.Int, staffId)
      .input('EventID', sql.Int, eventId)
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .query(`
        SELECT e.Title, e.StartDate, e.EndDate 
        FROM EventStaffs es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.StaffID = @StaffID
          AND es.EventID != @EventID
          AND (
            (@StartDate < e.EndDate AND @EndDate > e.StartDate)
          )
      `);
    return result.recordset[0];
  }

  async assignStaff(eventId, staffId, assignedBy) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .input('AssignedBy', sql.Int, assignedBy)
      .query(`
        INSERT INTO EventStaffs (EventID, StaffID, AssignedBy)
        VALUES (@EventID, @StaffID, @AssignedBy)
      `);
  }

  async createNotification(userId, title, message, type) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('Type', sql.VarChar(30), type)
      .query('INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (@UserID, @Title, @Message, @Type)');
  }

  async revokeStaff(eventId, staffId) {
    const pool = getPool();
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query('DELETE FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');
  }

  async getRegistrationWithOTP(eventId, participantId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query(`
        SELECT r.RegistrationID, r.Status, qt.OTPCode, qt.IsUsed, e.StartDate, e.EndDate
        FROM Registrations r
        JOIN QRTickets qt ON r.RegistrationID = qt.RegistrationID
        JOIN Events e ON r.EventID = e.EventID
        WHERE r.EventID = @EventID AND r.ParticipantID = @ParticipantID
      `);
    return result.recordset[0];
  }

  async markOTPAsUsed(registrationId) {
    const pool = getPool();
    await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .query('UPDATE QRTickets SET IsUsed = 1 WHERE RegistrationID = @RegistrationID');
  }

  async createAttendanceRecord(registrationId, staffId) {
    const pool = getPool();
    await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .input('CheckedInBy', sql.Int, staffId)
      .query(`
        INSERT INTO Attendance (RegistrationID, CheckedInBy, Status, CheckInTime)
        VALUES (@RegistrationID, @CheckedInBy, 'Present', GETDATE())
      `);
  }

  async getMyEvents(staffId) {
    const pool = getPool();
    const result = await pool.request()
      .input('StaffID', sql.Int, staffId)
      .query(`
        SELECT e.EventID, e.Title, e.StartDate, e.EndDate, e.Status, e.CoverImageURL, v.Name as VenueName
        FROM EventStaffs es
        JOIN Events e ON es.EventID = e.EventID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        WHERE es.StaffID = @StaffID
        ORDER BY e.StartDate DESC
      `);
    return result.recordset;
  }
}

module.exports = new StaffRepository();
