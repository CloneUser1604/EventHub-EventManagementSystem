const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } = require('../utils/response');

// ─── GET PENDING INVITATION (Lần đăng nhập đầu tiên) ─────────
const getPendingInvitation = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    // Tìm các sự kiện đã Published mà Diễn giả này được mời
    const result = await pool.request()
      .input('SpeakerID', sql.Int, parseInt(userId))
      .query(`
        SELECT e.EventID, e.Title, e.StartDate, e.EndDate, es.CreatedAt as InvitedAt
        FROM SpeakerInvitations es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.SpeakerID = @SpeakerID AND e.Status = 'Published'
        ORDER BY es.CreatedAt DESC
      `);

    if (result.recordset.length === 0) {
      return successResponse(res, [], 'Không có lời mời sự kiện nào');
    }

    return successResponse(res, result.recordset, 'Lấy lời mời thành công');
  } catch (error) {
    console.error('getPendingInvitation error:', error);
    return errorResponse(res, 'Lỗi lấy lời mời sự kiện');
  }
};

// ─── FIRST TIME SETUP (Đổi mật khẩu & Trả lời lời mời) ────────
const firstTimeSetup = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword, responses } = req.body; // responses: { eventId, accept }[]

    if (!newPassword || newPassword.length < 8) {
      return errorResponse(res, 'Mật khẩu phải từ 8 ký tự trở lên', 400);
    }

    const pool = getPool();

    // 1. Cập nhật mật khẩu và huỷ cờ MustChangePassword
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input('UserID', sql.Int, parseInt(userId))
      .input('PasswordHash', sql.VarChar(255), hashedPassword)
      .query(`
        UPDATE Users 
        SET PasswordHash = @PasswordHash, MustChangePassword = 0, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);

    // 2. Cập nhật các lời mời tham gia sự kiện
    if (responses && Array.isArray(responses)) {
      for (const r of responses) {
        if (r.accept === false) {
          await pool.request()
            .input('EventID', sql.Int, parseInt(r.eventId))
            .input('SpeakerID', sql.Int, parseInt(userId))
            .query(`
              DELETE FROM SessionSpeakers 
              WHERE SpeakerID = @SpeakerID AND SessionID IN (SELECT SessionID FROM Sessions WHERE EventID = @EventID);
              
              DELETE FROM SpeakerInvitations 
              WHERE EventID = @EventID AND SpeakerID = @SpeakerID;
            `);
        } else {
          await pool.request()
            .input('EventID', sql.Int, parseInt(r.eventId))
            .input('SpeakerID', sql.Int, parseInt(userId))
            .query(`UPDATE SpeakerInvitations SET Status = 'Accepted' WHERE EventID = @EventID AND SpeakerID = @SpeakerID`);
        }
      }
    }

    return successResponse(res, null, 'Cập nhật tài khoản thành công. Vui lòng đăng nhập lại.');
  } catch (error) {
    console.error('firstTimeSetup error:', error);
    return errorResponse(res, 'Cập nhật tài khoản thất bại');
  }
};

// ─── GET NOTIFICATIONS / INVITATIONS ──────────────────────────
const getInvitations = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.UserID)
      .query(`
        SELECT n.* FROM Notifications n
        JOIN Events e ON n.RelatedID = e.EventID
        WHERE n.UserID = @UserID 
          AND n.Type = 'SpeakerInvitation'
          AND e.Status IN ('Published', 'Completed')
        ORDER BY n.CreatedAt DESC
      `);
    return successResponse(res, result.recordset, 'Lấy danh sách lời mời thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách lời mời');
  }
};

// ─── RESPOND INVITATION (Cho Speaker đã login) ────────────────
const respondInvitation = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action, notificationId } = req.body; // 'Accepted' hoặc 'Declined'
    const pool = getPool();

    if (action === 'Declined') {
      await pool.request()
        .input('EventID', sql.Int, parseInt(eventId))
        .input('SpeakerID', sql.Int, req.user.UserID)
        .query(`
          DELETE FROM SessionSpeakers 
          WHERE SpeakerID = @SpeakerID AND SessionID IN (SELECT SessionID FROM Sessions WHERE EventID = @EventID);
          
          DELETE FROM SpeakerInvitations 
          WHERE EventID = @EventID AND SpeakerID = @SpeakerID;
        `);
    } else if (action === 'Accepted') {
      await pool.request()
        .input('EventID', sql.Int, parseInt(eventId))
        .input('SpeakerID', sql.Int, req.user.UserID)
        .query(`UPDATE SpeakerInvitations SET Status = 'Accepted' WHERE EventID = @EventID AND SpeakerID = @SpeakerID`);
    }

    if (notificationId) {
      await pool.request()
        .input('NotificationID', sql.Int, notificationId)
        .query('UPDATE Notifications SET IsRead = 1 WHERE NotificationID = @NotificationID');
    }

    return successResponse(res, null, action === 'Accepted' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời');
  } catch (error) {
    return errorResponse(res, 'Xử lý phản hồi thất bại');
  }
};

// ─── LẤY DANH SÁCH SỰ KIỆN CỦA DIỄN GIẢ ────────────────────────
const getSpeakerEvents = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('SpeakerID', sql.Int, req.user.UserID)
      .query(`
        SELECT DISTINCT e.EventID, e.Title, e.StartDate, e.EndDate, e.Status, e.CoverImageURL
        FROM SpeakerInvitations es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.SpeakerID = @SpeakerID
          AND e.Status IN ('Published', 'Completed')
        ORDER BY e.StartDate DESC
      `);
    return successResponse(res, result.recordset, 'Lấy danh sách sự kiện thành công');
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy sự kiện');
  }
};

module.exports = {
  getPendingInvitation,
  firstTimeSetup,
  getInvitations,
  respondInvitation,
  getSpeakerEvents
};
