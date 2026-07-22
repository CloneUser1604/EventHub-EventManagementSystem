const { getPool, sql } = require('../config/db');
const { successResponse, createdResponse, errorResponse, notFoundResponse, forbiddenResponse, conflictResponse } = require('../utils/response');
const registrationService = require('../services/registration.service');

// ─── REGISTER EVENT ──────────────────────────────────────────────
const registerEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const participantId = req.user.UserID;

    const result = await registrationService.registerEvent(eventId, participantId);
    
    if (result.action === 're-register') {
      return successResponse(res, result.data, 'Đăng ký lại thành công');
    }
    return createdResponse(res, result.data, 'Đăng ký thành công! Mã OTP đã được tạo. Vui lòng xem vé để check-in.');
  } catch (error) {
    console.error('registerEvent error:', error);
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return notFoundResponse(res, msg.split(': ')[1]);
    if (msg.startsWith('BAD_REQUEST')) return errorResponse(res, msg.split(': ')[1], 400);
    if (msg.startsWith('FORBIDDEN')) return forbiddenResponse(res, msg.split(': ')[1]);
    if (msg.startsWith('CONFLICT')) return conflictResponse(res, msg.split(': ')[1]);
    return errorResponse(res, 'Đăng ký thất bại');
  }
};

// ─── CANCEL REGISTRATION ──────────────────────────────────────────────
const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    const eventTitle = await registrationService.cancelRegistration(parseInt(id), req.user.UserID, note);
    return successResponse(res, null, `Đã huỷ đăng ký sự kiện "${eventTitle}"`);
  } catch (error) {
    const msg = error.message;
    if (msg.startsWith('NOT_FOUND')) return notFoundResponse(res, msg.split(': ')[1]);
    if (msg.startsWith('FORBIDDEN')) return forbiddenResponse(res);
    if (msg.startsWith('BAD_REQUEST')) return errorResponse(res, msg.split(': ')[1], 400);
    return errorResponse(res, 'Huỷ đăng ký thất bại');
  }
};

// ─── GET MY REGISTRATIONS ──────────────────────────────────────────────
const getMyRegistrations = async (req, res) => {
  try {
    const pool = getPool();
    const { status } = req.query; // Registered | Cancelled
    const request = pool.request().input('PID', sql.Int, req.user.UserID);
    request.input('Status', sql.VarChar(20), status || null);
    request.input('UserRole', sql.VarChar(50), req.user.Role);

    const result = await request.query(`
      WITH MyEvents AS (
        SELECT e.EventID, e.Title, e.StartDate, e.EndDate, e.CoverImageURL, e.Status AS EventStatus,
               v.Name AS VenueName, v.Address AS VenueAddress,
               ISNULL(r.RegistrationID, 0) AS RegistrationID, 
               ISNULL(r.Status, CASE WHEN spk.SpeakerID IS NOT NULL OR es.EventStaffID IS NOT NULL THEN 'Registered' ELSE NULL END) AS Status, 
               r.RegisteredAt, r.CancelledAt,
               qt.QRCode, qt.OTPCode, qt.IsUsed,
               a.Status AS AttendanceStatus,
               CAST(CASE WHEN es.EventStaffID IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isStaffForThisEvent,
               CAST(CASE WHEN spk.SpeakerID IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS isSpeakerForThisEvent
        FROM Events e
        LEFT JOIN Registrations r ON e.EventID = r.EventID AND r.ParticipantID = @PID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        LEFT JOIN QRTickets qt ON r.RegistrationID = qt.RegistrationID
        LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
        LEFT JOIN EventStaffs es ON e.EventID = es.EventID AND es.StaffID = @PID
        LEFT JOIN SpeakerInvitations spk ON e.EventID = spk.EventID AND spk.SpeakerID = @PID AND spk.Status = 'Accepted'
        WHERE r.ParticipantID = @PID OR spk.SpeakerID = @PID OR es.StaffID = @PID
      )
      SELECT * FROM MyEvents
      WHERE (@Status IS NULL OR Status = @Status OR ((isSpeakerForThisEvent = 1 OR isStaffForThisEvent = 1) AND @Status = 'Confirmed' AND (Status IS NULL OR Status <> 'Cancelled')))
      ORDER BY StartDate DESC
    `);
    return successResponse(res, result.recordset);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách đăng ký thất bại');
  }
};

// ─── GET TICKET ──────────────────────────────────────────────
const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.request().input('RegistrationID', sql.Int, parseInt(id))
      .query(`
        SELECT r.RegistrationID, r.Status, r.RegisteredAt,
               e.EventID, e.Title, e.StartDate, e.EndDate, e.CoverImageURL,
               v.Name AS VenueName, v.Address AS VenueAddress,
               u.FullName AS ParticipantName, u.Email AS ParticipantEmail,
               qt.QRCode, qt.OTPCode, qt.OTPExpiry, qt.IsUsed
        FROM Registrations r
        JOIN Events e ON r.EventID = e.EventID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        JOIN Users u ON r.ParticipantID = u.UserID
        LEFT JOIN QRTickets qt ON r.RegistrationID = qt.RegistrationID
        WHERE r.RegistrationID = @RegistrationID
      `);
    const ticket = result.recordset[0];
    if (!ticket) return notFoundResponse(res, 'Không tìm thấy vé');
    if (ticket.ParticipantEmail !== req.user.Email && req.user.Role !== 'Admin' && req.user.Role !== 'Staff')
      return forbiddenResponse(res);
    return successResponse(res, ticket);
  } catch (error) {
    return errorResponse(res, 'Lấy thông tin vé thất bại');
  }
};

// ─── GET NOTIFICATIONS ──────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().input('UserID', sql.Int, req.user.UserID)
      .query(`SELECT TOP 30 * FROM Notifications WHERE UserID=@UserID ORDER BY CreatedAt DESC`);
    return successResponse(res, result.recordset);
  } catch (error) {
    return errorResponse(res, 'Lấy thông báo thất bại');
  }
};

// ─── MARK NOTIFICATION READ ──────────────────────────────────────────────
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.request()
      .input('NID', sql.Int, parseInt(id)).input('UserID', sql.Int, req.user.UserID)
      .query(`UPDATE Notifications SET IsRead=1 WHERE NotificationID=@NID AND UserID=@UserID`);
    return successResponse(res, null, 'Đã đọc');
  } catch (error) {
    return errorResponse(res, 'Cập nhật thất bại');
  }
};

module.exports = { registerEvent, cancelRegistration, getMyRegistrations, getTicket, getNotifications, markNotificationRead };