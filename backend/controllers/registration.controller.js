const crypto = require('crypto');
const { getPool, sql } = require('../config/db');
const { successResponse, createdResponse, errorResponse, notFoundResponse, forbiddenResponse, conflictResponse } = require('../utils/response');

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
// Generate unique QR token
const generateQRToken = () => crypto.randomBytes(20).toString('hex');

// ─── POST /api/registrations  ─────────────────────────────────
const registerEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    const participantId = req.user.UserID;
    const pool = getPool();

    // Fetch event
    const eventRes = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT EventID, Title, Status, RegistrationDeadline, MaxParticipants, IsInternalOnly,
                (SELECT COUNT(*) FROM Registrations WHERE EventID=@EventID AND Status='Registered') AS RegisteredCount
              FROM Events WHERE EventID=@EventID`);
    const event = eventRes.recordset[0];
    if (!event) return notFoundResponse(res, 'Không tìm thấy sự kiện');
    if (event.Status !== 'Published') return errorResponse(res, 'Sự kiện chưa được công bố', 400);
    if (event.RegistrationDeadline && new Date() > new Date(event.RegistrationDeadline))
      return errorResponse(res, 'Đã hết hạn đăng ký', 400);
    if (event.MaxParticipants && event.RegisteredCount >= event.MaxParticipants)
      return errorResponse(res, 'Sự kiện đã đầy chỗ', 400);
    
    // ĐÃ SỬA: Lấy trực tiếp thông tin trường Đại học từ DB thay vì Token
    const userRes = await pool.request()
      .input('UserID', sql.Int, participantId)
      .query('SELECT University FROM Users WHERE UserID = @UserID');
    const userUniv = userRes.recordset[0]?.University;

    // Check internal only
    if (event.IsInternalOnly && userUniv !== 'Đại học FPT') {
      return forbiddenResponse(res, 'Sự kiện này chỉ dành cho sinh viên trường Đại học FPT');
    }

    // Check duplicate
    const dup = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`SELECT RegistrationID, Status FROM Registrations WHERE EventID=@EventID AND ParticipantID=@PID`);
    if (dup.recordset.length > 0) {
      if (dup.recordset[0].Status === 'Registered') return conflictResponse(res, 'Bạn đã đăng ký sự kiện này');
      // Re-register if cancelled
      await pool.request().input('RegistrationID', sql.Int, dup.recordset[0].RegistrationID)
        .query(`UPDATE Registrations SET Status='Registered', CancelledAt=NULL, CancellationNote=NULL WHERE RegistrationID=@RegistrationID`);
      return successResponse(res, { registrationId: dup.recordset[0].RegistrationID }, 'Đăng ký lại thành công');
    }

    // Create registration
    const regResult = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`INSERT INTO Registrations (EventID, ParticipantID) OUTPUT INSERTED.RegistrationID VALUES (@EventID, @PID)`);
    const registrationId = regResult.recordset[0].RegistrationID;

    // Generate QR + OTP
    const qrCode  = generateQRToken();
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // valid until event ends

    await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .input('QRCode', sql.VarChar(500), qrCode)
      .input('OTPCode', sql.VarChar(10), otpCode)
      .input('OTPExpiry', sql.DateTime, otpExpiry)
      .query(`INSERT INTO QRTickets (RegistrationID, QRCode, OTPCode, OTPExpiry) VALUES (@RegistrationID, @QRCode, @OTPCode, @OTPExpiry)`);

    // Send in-app notification
    await pool.request()
      .input('UserID', sql.Int, participantId)
      .input('Title', sql.NVarChar(300), `🎟️ Đăng ký thành công: ${event.Title}`)
      .input('Message', sql.NVarChar(sql.MAX), `Bạn đã đăng ký thành công sự kiện "${event.Title}". Mã OTP của bạn: ${otpCode}. Giữ mã này để check-in.`)
      .input('Type', sql.VarChar(30), 'Registration')
      .input('RelatedID', sql.Int, eventId)
      .input('RelatedType', sql.VarChar(50), 'Event')
      .query(`INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)`);

    return createdResponse(res, { registrationId, qrCode, otpCode }, 'Đăng ký thành công! QR Code và OTP đã được tạo.');
  } catch (error) {
    console.error('registerEvent error:', error);
    return errorResponse(res, 'Đăng ký thất bại');
  }
};

// ─── DELETE /api/registrations/:id  ──────────────────────────
const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const pool = getPool();

    const regRes = await pool.request().input('RegistrationID', sql.Int, parseInt(id))
      .query(`SELECT r.*, e.RegistrationDeadline, e.Title AS EventTitle FROM Registrations r JOIN Events e ON r.EventID=e.EventID WHERE r.RegistrationID=@RegistrationID`);
    const reg = regRes.recordset[0];
    if (!reg) return notFoundResponse(res, 'Không tìm thấy đăng ký');
    if (reg.ParticipantID !== req.user.UserID) return forbiddenResponse(res);
    if (reg.Status !== 'Registered') return errorResponse(res, 'Đăng ký này không thể huỷ', 400);
    if (reg.RegistrationDeadline && new Date() > new Date(reg.RegistrationDeadline))
      return errorResponse(res, 'Đã qua hạn huỷ đăng ký', 400);

    await pool.request()
      .input('RegistrationID', sql.Int, parseInt(id))
      .input('Note', sql.NVarChar(500), note || null)
      .query(`UPDATE Registrations SET Status='Cancelled', CancelledAt=GETDATE(), CancellationNote=@Note WHERE RegistrationID=@RegistrationID`);

    return successResponse(res, null, `Đã huỷ đăng ký sự kiện "${reg.EventTitle}"`);
  } catch (error) {
    return errorResponse(res, 'Huỷ đăng ký thất bại');
  }
};

// ─── GET /api/registrations/my  ──────────────────────────────
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

// ─── GET /api/registrations/:id/ticket  ──────────────────────
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

// ─── GET /api/registrations/notifications  ───────────────────
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