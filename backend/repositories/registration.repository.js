const { getPool, sql } = require('../config/db');

class RegistrationRepository {
  // [Tìm sự kiện để đăng ký] Nhận từ Service -> SELECT Events kèm số lượng đăng ký
  async findEventForRegistration(eventId) {
    const pool = getPool();
    const eventRes = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT EventID, Title, Status, RegistrationDeadline, MaxParticipants, IsInternalOnly, StartDate, EndDate,
                (SELECT COUNT(*) FROM Registrations WHERE EventID=@EventID AND Status='Registered') AS RegisteredCount
              FROM Events WHERE EventID=@EventID`);
    return eventRes.recordset[0];
  }

  // [Kiểm tra sinh viên FPT] Dùng cột University thay vì IsFPTStudent (cột không tồn tại trong DB)
  async findUserIsFPTStudent(userId) {
    const pool = getPool();
    const userRes = await pool.request()
      .input('UserID', sql.Int, userId)
      .query("SELECT University FROM Users WHERE UserID = @UserID");
    const university = userRes.recordset[0]?.University || '';
    return university.toLowerCase().includes('fpt');
  }

  // [Kiểm tra trùng đăng ký] Nhận từ Service -> SELECT Registrations theo EventID + ParticipantID
  async findDuplicateRegistration(eventId, participantId) {
    const pool = getPool();
    const dup = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`SELECT RegistrationID, Status FROM Registrations WHERE EventID=@EventID AND ParticipantID=@PID`);
    return dup.recordset[0];
  }

  // [Kiểm tra trùng lịch] Nhận từ Service -> SELECT Registrations JOIN Events theo khoảng thời gian
  async findOverlappingRegistrations(participantId, eventId, startDate, endDate) {
    const pool = getPool();
    const result = await pool.request()
      .input('ParticipantID', sql.Int, participantId)
      .input('EventID', sql.Int, eventId)
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .query(`
        SELECT e.EventID, e.Title, e.StartDate, e.EndDate 
        FROM Registrations r
        JOIN Events e ON r.EventID = e.EventID
        WHERE r.ParticipantID = @ParticipantID 
          AND r.Status = 'Registered'
          AND e.Status != 'Cancelled'
          AND r.EventID != @EventID
          AND (
            (@StartDate BETWEEN e.StartDate AND e.EndDate)
            OR (@EndDate BETWEEN e.StartDate AND e.EndDate)
            OR (e.StartDate BETWEEN @StartDate AND @EndDate)
          )
      `);
    return result.recordset;
  }

  // [Cập nhật trạng thái đăng ký] Nhận từ Service -> UPDATE bảng Registrations
  async updateRegistrationStatus(registrationId, status, note = null) {
    const pool = getPool();
    if (status === 'Registered') {
      await pool.request().input('RegistrationID', sql.Int, registrationId)
        .query(`UPDATE Registrations SET Status='Registered', CancelledAt=NULL, CancellationNote=NULL WHERE RegistrationID=@RegistrationID`);
    } else if (status === 'Cancelled') {
      await pool.request()
        .input('RegistrationID', sql.Int, registrationId)
        .input('Note', sql.NVarChar(500), note)
        .query(`UPDATE Registrations SET Status='Cancelled', CancelledAt=GETDATE(), CancellationNote=@Note WHERE RegistrationID=@RegistrationID`);
    }
  }

  // [Tạo đăng ký mới] Nhận từ Service -> INSERT INTO Registrations
  async insertRegistration(eventId, participantId) {
    const pool = getPool();
    const regResult = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`INSERT INTO Registrations (EventID, ParticipantID) OUTPUT INSERTED.RegistrationID VALUES (@EventID, @PID)`);
    return regResult.recordset[0].RegistrationID;
  }

  // [Tạo vé QR + OTP] Nhận từ Service -> INSERT INTO QRTickets
  async insertQRTicket(registrationId, qrCode, otpCode, otpExpiry) {
    const pool = getPool();
    await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .input('QRCode', sql.VarChar(500), qrCode)
      .input('OTPCode', sql.VarChar(10), otpCode)
      .input('OTPExpiry', sql.DateTime, otpExpiry)
      .query(`INSERT INTO QRTickets (RegistrationID, QRCode, OTPCode, OTPExpiry) VALUES (@RegistrationID, @QRCode, @OTPCode, @OTPExpiry)`);
  }

  // [Tạo thông báo đăng ký] Nhận từ Service -> INSERT INTO Notifications
  async insertNotification(userId, title, message, type, relatedId, relatedType) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('Type', sql.VarChar(30), type)
      .input('RelatedID', sql.Int, relatedId)
      .input('RelatedType', sql.VarChar(50), relatedType)
      .query(`INSERT INTO Notifications (UserID,Title,Message,Type,RelatedID,RelatedType) VALUES (@UserID,@Title,@Message,@Type,@RelatedID,@RelatedType)`);
  }

  // [Tìm đăng ký để hủy] Nhận từ Service -> SELECT Registrations JOIN Events
  async findRegistrationForCancel(registrationId) {
    const pool = getPool();
    const regRes = await pool.request().input('RegistrationID', sql.Int, registrationId)
      .query(`
        SELECT r.*, e.RegistrationDeadline, e.StartDate, e.Title AS EventTitle,
               (SELECT TOP 1 IsUsed FROM QRTickets WHERE RegistrationID = r.RegistrationID) AS IsTicketUsed
        FROM Registrations r 
        JOIN Events e ON r.EventID=e.EventID 
        WHERE r.RegistrationID=@RegistrationID
      `);
    return regRes.recordset[0];
  }
}

module.exports = new RegistrationRepository();
