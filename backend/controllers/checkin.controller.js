const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// ─── VERIFY OTP (Participant check-in) ────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { qrToken, otpCode } = req.body;
    const participantId = req.user.UserID;

    if (!qrToken || !otpCode) {
      return res.status(400).json({ success: false, message: 'Cần cung cấp mã phiên check-in của Staff và mã OTP' });
    }

    // 1. Verify Staff QR Token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.JWT_SECRET || 'ems_super_secret_key');
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Mã QR của Staff không hợp lệ hoặc đã hết hạn' });
    }

    if (decoded.type !== 'checkin_session' || !decoded.eventId || !decoded.staffId) {
      return res.status(400).json({ success: false, message: 'Mã QR không phải là phiên check-in hợp lệ' });
    }

    const { eventId, staffId } = decoded;

    const pool = getPool();

    // 2. Check if participant is registered and event time is valid
    const regResult = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query(`
        SELECT r.RegistrationID, r.Status, e.StartDate, e.EndDate 
        FROM Registrations r
        JOIN Events e ON r.EventID = e.EventID
        WHERE r.EventID = @EventID AND r.ParticipantID = @ParticipantID
      `);

    const registration = regResult.recordset[0];
    if (!registration || registration.Status !== 'Registered') {
      return res.status(403).json({ success: false, message: 'Bạn chưa đăng ký hoặc đăng ký đã bị huỷ' });
    }

    const now = new Date();
    const startDate = new Date(registration.StartDate);
    const endDate = new Date(registration.EndDate);

    if (now < startDate) {
      return res.status(400).json({ success: false, message: 'Sự kiện chưa diễn ra, không thể check-in' });
    }
    if (now > endDate) {
      return res.status(400).json({ success: false, message: 'Sự kiện đã kết thúc, không thể check-in' });
    }

    // 3. Verify OTP
    const ticketResult = await pool.request()
      .input('RegistrationID', sql.Int, registration.RegistrationID)
      .query('SELECT TicketID, OTPCode, OTPExpiry, IsUsed FROM QRTickets WHERE RegistrationID = @RegistrationID');

    const ticket = ticketResult.recordset[0];
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé' });
    }

    if (ticket.IsUsed) {
      return res.status(400).json({ success: false, message: 'Vé này đã được sử dụng (bạn đã check-in)' });
    }

    if (ticket.OTPCode !== otpCode) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    // 4. Mark as Checked In
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input('TicketID', sql.Int, ticket.TicketID)
        .query('UPDATE QRTickets SET IsUsed = 1 WHERE TicketID = @TicketID');

      await transaction.request()
        .input('RegistrationID', sql.Int, registration.RegistrationID)
        .input('CheckedInBy', sql.Int, staffId)
        .query(`
          INSERT INTO Attendance (RegistrationID, CheckedInBy, CheckInTime, Status)
          VALUES (@RegistrationID, @CheckedInBy, GETDATE(), 'Present')
        `);

      await transaction.commit();

      return res.status(200).json({ success: true, message: 'Check-in thành công!' });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý check-in' });
  }
};

module.exports = {
  verifyOTP
};
