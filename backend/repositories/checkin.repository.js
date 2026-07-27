const { getPool, sql } = require('../config/db');

class CheckinRepository {
  async getRegistration(eventId, participantId) {
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query(`
        SELECT r.RegistrationID, r.Status, e.StartDate, e.EndDate 
        FROM Registrations r
        JOIN Events e ON r.EventID = e.EventID
        WHERE r.EventID = @EventID AND r.ParticipantID = @ParticipantID
      `);
    return result.recordset[0];
  }

  async getTicket(registrationId) {
    const pool = getPool();
    const result = await pool.request()
      .input('RegistrationID', sql.Int, registrationId)
      .query('SELECT TicketID, OTPCode, OTPExpiry, IsUsed FROM QRTickets WHERE RegistrationID = @RegistrationID');
    return result.recordset[0];
  }

  async performCheckin(ticketId, registrationId, staffId) {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await transaction.request()
        .input('TicketID', sql.Int, ticketId)
        .query('UPDATE QRTickets SET IsUsed = 1 WHERE TicketID = @TicketID');

      await transaction.request()
        .input('RegistrationID', sql.Int, registrationId)
        .input('CheckedInBy', sql.Int, staffId)
        .query(`
          INSERT INTO Attendance (RegistrationID, CheckedInBy, CheckInTime, Status)
          VALUES (@RegistrationID, @CheckedInBy, GETDATE(), 'Present')
        `);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new CheckinRepository();
