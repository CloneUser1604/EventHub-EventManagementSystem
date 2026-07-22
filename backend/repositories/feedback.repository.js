const { getPool, sql } = require('../config/db');

class FeedbackRepository {
  // ─── GET FEEDBACKS BY EVENT ID ──────────────────────────────────────────────
async getFeedbacksByEventId(eventId) {
    const pool = getPool();
    const result = await pool.request().input("eventId", sql.Int, eventId)
      .query(`
        SELECT f.FeedbackID, f.ParticipantID, f.Rating, f.Comment, f.CreatedAt, f.UpdatedAt, f.MediaURLs, f.Reply, f.RepliedAt,
               u.FullName as UserName, u.AvatarURL
        FROM Feedbacks f
        INNER JOIN Users u ON f.ParticipantID = u.UserID
        WHERE f.EventID = @eventId
        ORDER BY f.CreatedAt DESC
      `);
    return result.recordset;
  }

  async getEventFeedbackStats(eventId) {
    const pool = getPool();
    const statsResult = await pool.request().input("eventId", sql.Int, eventId)
      .query(`
        SELECT 
            COUNT(*) as TotalReviews,
            AVG(CAST(Rating AS FLOAT)) as AverageRating,
            SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END) as Star5,
            SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END) as Star4,
            SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END) as Star3,
            SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END) as Star2,
            SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END) as Star1
        FROM Feedbacks
        WHERE EventID = @eventId
      `);
    return statsResult.recordset[0] || {TotalReviews: 0, AverageRating: 0};
  }

  // ─── CHECK EVENT ELIGIBILITY ──────────────────────────────────────────────
async checkEventEligibility(eventId, userId) {
    const pool = getPool();
    const checkQuery = `
      SELECT e.EndDate, r.Status as RegistrationStatus, a.AttendanceID
      FROM Events e
      LEFT JOIN Registrations r ON e.EventID = r.EventID AND r.ParticipantID = @userId
      LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
      WHERE e.EventID = @eventId
    `;
    const checkResult = await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkQuery);
    return checkResult.recordset[0];
  }

  async checkIfFeedbackExists(eventId, userId) {
    const pool = getPool();
    const checkFeedbackQuery = `SELECT FeedbackID FROM Feedbacks WHERE EventID = @eventId AND ParticipantID = @userId`;
    const feedbackResult = await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkFeedbackQuery);
    return feedbackResult.recordset.length > 0;
  }

  // ─── CREATE FEEDBACK ──────────────────────────────────────────────
async createFeedback(eventId, userId, rating, comment, mediaURLs) {
    const pool = getPool();
    const insertQuery = `
      INSERT INTO Feedbacks (EventID, ParticipantID, Rating, Comment, MediaURLs)
      VALUES (@eventId, @userId, @rating, @comment, @mediaURLs)
    `;
    await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar, comment || "")
      .input("mediaURLs", sql.NVarChar, mediaURLs.length > 0 ? JSON.stringify(mediaURLs) : null)
      .query(insertQuery);
  }

  // ─── UPDATE FEEDBACK ──────────────────────────────────────────────
async updateFeedback(eventId, userId, rating, comment, mediaURLs) {
    const pool = getPool();
    const updateQuery = `
      UPDATE Feedbacks 
      SET Rating = @rating, Comment = @comment, MediaURLs = @mediaURLs, UpdatedAt = GETDATE()
      WHERE EventID = @eventId AND ParticipantID = @userId
    `;
    await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar, comment || "")
      .input("mediaURLs", sql.NVarChar, mediaURLs.length > 0 ? JSON.stringify(mediaURLs) : null)
      .query(updateQuery);
  }

  // ─── DELETE FEEDBACK ──────────────────────────────────────────────
async deleteFeedback(feedbackId, userId) {
    const pool = getPool();
    const result = await pool.request()
      .input("feedbackId", sql.Int, feedbackId)
      .input("userId", sql.Int, userId)
      .query(`DELETE FROM Feedbacks WHERE FeedbackID = @feedbackId AND ParticipantID = @userId`);
    return result.rowsAffected[0] > 0;
  }

  async checkIsOrganizer(eventId, userId) {
    const pool = getPool();
    const eventResult = await pool.request().input("eventId", sql.Int, eventId).input("userId", sql.Int, userId)
      .query(`SELECT EventID FROM Events WHERE EventID = @eventId AND OrganizerID = @userId`);
    return eventResult.recordset.length > 0;
  }

  async replyFeedback(feedbackId, reply) {
    const pool = getPool();
    await pool.request()
      .input("feedbackId", sql.Int, feedbackId)
      .input("reply", sql.NVarChar, reply)
      .query(`
        UPDATE Feedbacks 
        SET Reply = @reply, 
            ReplyUpdatedAt = CASE WHEN Reply IS NOT NULL THEN GETDATE() ELSE NULL END,
            RepliedAt = CASE WHEN Reply IS NULL THEN GETDATE() ELSE RepliedAt END
        WHERE FeedbackID = @feedbackId
      `);
  }

  async reportFeedback(feedbackId, reason, userId) {
    const pool = getPool();
    await pool.request()
      .input("feedbackId", sql.Int, feedbackId)
      .input("reason", sql.NVarChar, reason)
      .input("userId", sql.Int, userId)
      .query(`UPDATE Feedbacks SET IsReported = 1, ReportReason = @reason, ReportedAt = GETDATE(), ReportedBy = @userId WHERE FeedbackID = @feedbackId`);
  }

  async getReportedFeedbacks() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT f.*, e.Title as EventTitle, u.FullName as ParticipantName, o.FullName as ReporterName
      FROM Feedbacks f
      JOIN Events e ON f.EventID = e.EventID
      JOIN Users u ON f.ParticipantID = u.UserID
      JOIN Users o ON f.ReportedBy = o.UserID
      WHERE f.IsReported = 1
      ORDER BY f.ReportedAt DESC
    `);
    return result.recordset;
  }

  async resolveReport(feedbackId, action) {
    const pool = getPool();
    if (action === 'delete') {
      await pool.request().input("feedbackId", sql.Int, feedbackId)
        .query(`DELETE FROM Feedbacks WHERE FeedbackID = @feedbackId`);
    } else {
      await pool.request().input("feedbackId", sql.Int, feedbackId)
        .query(`UPDATE Feedbacks SET IsReported = 0, ReportReason = NULL, ReportedAt = NULL, ReportedBy = NULL WHERE FeedbackID = @feedbackId`);
    }
  }
}

module.exports = new FeedbackRepository();
