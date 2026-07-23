const { getPool, sql } = require('../config/db');

class RegistrationRepository {
  // ─── FIND EVENT FOR REGISTRATION ──────────────────────────────────────────────
async findEventForRegistration(eventId) {
    const pool = getPool();
    const eventRes = await pool.request().input('EventID', sql.Int, eventId)
      .query(`SELECT EventID, Title, Status, RegistrationDeadline, MaxParticipants, IsInternalOnly,
                (SELECT COUNT(*) FROM Registrations WHERE EventID=@EventID AND Status='Registered') AS RegisteredCount
              FROM Events WHERE EventID=@EventID`);
    return eventRes.recordset[0];
  }

    async findUserUniversity(userId) {
    const pool = getPool();
    const userRes = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT University FROM Users WHERE UserID = @UserID');
    return userRes.recordset[0]?.University;
  }

    async findDuplicateRegistration(eventId, participantId) {
    const pool = getPool();
    const dup = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`SELECT RegistrationID, Status FROM Registrations WHERE EventID=@EventID AND ParticipantID=@PID`);
    return dup.recordset[0];
  }

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

    async insertRegistration(eventId, participantId) {
    const pool = getPool();
    const regResult = await pool.request()
      .input('EventID', sql.Int, eventId).input('PID', sql.Int, participantId)
      .query(`INSERT INTO Registrations (EventID, ParticipantID) OUTPUT INSERTED.RegistrationID VALUES (@EventID, @PID)`);
    return regResult.recordset[0].RegistrationID;
  }

    async insertQRTicket(registrationId, qrCode, otpCode, otpExpiry) {
    const pool = getPool();
    await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .input('QRCode', sql.VarChar(500), qrCode)
      .input('OTPCode', sql.VarChar(10), otpCode)
      .input('OTPExpiry', sql.DateTime, otpExpiry)
      .query(`INSERT INTO QRTickets (RegistrationID, QRCode, OTPCode, OTPExpiry) VALUES (@RegistrationID, @QRCode, @OTPCode, @OTPExpiry)`);
  }

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

  // ─── FIND REGISTRATION FOR CANCEL ──────────────────────────────────────────────
async findRegistrationForCancel(registrationId) {
    const pool = getPool();
    const regRes = await pool.request().input('RegistrationID', sql.Int, registrationId)
      .query(`SELECT r.*, e.RegistrationDeadline, e.Title AS EventTitle FROM Registrations r JOIN Events e ON r.EventID=e.EventID WHERE r.RegistrationID=@RegistrationID`);
    return regRes.recordset[0];
  }
}

module.exports = new RegistrationRepository();
