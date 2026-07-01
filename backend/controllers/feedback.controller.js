const {getPool, sql} = require("../config/db");

exports.getEventFeedbacks = async (req, res) => {
  try {
    const {eventId} = req.params;
    const pool = getPool();

        const result = await pool.request().input("eventId", sql.Int, eventId)
      .query(`
                SELECT f.FeedbackID, f.ParticipantID, f.Rating, f.Comment, f.CreatedAt, f.UpdatedAt, f.MediaURLs, f.Reply, f.RepliedAt, f.ReplyUpdatedAt,
                       u.FullName as UserName, u.AvatarURL
                FROM Feedbacks f
                INNER JOIN Users u ON f.ParticipantID = u.UserID
                WHERE f.EventID = @eventId
                ORDER BY f.CreatedAt DESC
            `);

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

    res.status(200).json({
      success: true,
      data: result.recordset,
      stats: statsResult.recordset[0] || {TotalReviews: 0, AverageRating: 0},
    });
  } catch (error) {
    res
      .status(500)
      .json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.createFeedback = async (req, res) => {
  try {
    const {eventId} = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment || "";
    const mediaURLs = req.files ? req.files.map(f => `/uploads/feedbacks/${f.filename}`) : [];

    const userId = req.user.UserID;

    const pool = getPool();

    // ĐÃ SỬA: Join với Registrations và Attendance để check đăng ký và check-in
    const checkQuery = `
            SELECT e.EndDate, r.Status as RegistrationStatus, a.AttendanceID
            FROM Events e
            LEFT JOIN Registrations r ON e.EventID = r.EventID AND r.ParticipantID = @userId
            LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
            WHERE e.EventID = @eventId
        `;
    const checkResult = await pool
      .request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkQuery);

    if (checkResult.recordset.length === 0)
      return res
        .status(404)
        .json({success: false, message: "Sự kiện không tồn tại."});

    const eventInfo = checkResult.recordset[0];

    // 1. Kiểm tra xem sự kiện đã kết thúc chưa
    if (new Date(eventInfo.EndDate) > new Date())
      return res.status(403).json({
        success: false,
        message: "Sự kiện chưa kết thúc, chưa thể đánh giá.",
      });

    // 2. Kiểm tra xem user ĐÃ ĐĂNG KÝ (Registered) chưa
    if (eventInfo.RegistrationStatus !== "Registered")
      return res.status(403).json({
        success: false,
        message: "Bạn phải đăng ký tham gia sự kiện mới được quyền đánh giá.",
      });

    // 3. Kiểm tra xem user đã CHECK-IN chưa
    if (!eventInfo.AttendanceID)
      return res.status(403).json({
        success: false,
        message: "Bạn phải check-in tham gia sự kiện thành công thì mới được quyền đánh giá.",
      });

    const insertQuery = `
            INSERT INTO Feedbacks (EventID, ParticipantID, Rating, Comment, MediaURLs)
            VALUES (@eventId, @userId, @rating, @comment, @mediaURLs)
        `;
    await pool
      .request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar, comment || "")
      .input("mediaURLs", sql.NVarChar, mediaURLs.length > 0 ? JSON.stringify(mediaURLs) : null)
      .query(insertQuery);

    res
      .status(201)
      .json({success: true, message: "Cảm ơn bạn đã đánh giá sự kiện!"});
  } catch (error) {
    if (error.number === 2627)
      return res
        .status(400)
        .json({success: false, message: "Bạn đã đánh giá sự kiện này rồi."});
    console.error("CREATE FEEDBACK ERROR: ", error);
    res
      .status(500)
      .json({success: false, message: error.message, error: error.message});
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const {eventId} = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment || "";
    
    // Process existing media
    let mediaURLs = [];
    if (req.body.existingMedia) {
      try {
        mediaURLs = JSON.parse(req.body.existingMedia);
      } catch (e) {
        if (typeof req.body.existingMedia === 'string') {
          mediaURLs = [req.body.existingMedia];
        } else if (Array.isArray(req.body.existingMedia)) {
          mediaURLs = req.body.existingMedia;
        }
      }
    }
    
    // Add new uploaded files
    if (req.files && req.files.length > 0) {
      const newMedia = req.files.map(f => `/uploads/feedbacks/${f.filename}`);
      mediaURLs = [...mediaURLs, ...newMedia];
    }
    
    const userId = req.user.UserID;

    const pool = getPool();

    // Kiểm tra xem feedback có tồn tại không
    const checkQuery = `SELECT FeedbackID FROM Feedbacks WHERE EventID = @eventId AND ParticipantID = @userId`;
    const checkResult = await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({success: false, message: "Bạn chưa đánh giá sự kiện này."});
    }

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

    res.status(200).json({success: true, message: "Cập nhật đánh giá thành công!"});
  } catch (error) {
    console.error("UPDATE FEEDBACK ERROR: ", error);
    res.status(500).json({success: false, message: error.message, error: error.message});
  }
};

exports.checkEligibility = async (req, res) => {
  try {
    const {eventId} = req.params;
    const userId = req.user.UserID;

    const pool = getPool();

    const checkQuery = `
            SELECT e.EndDate, r.Status as RegistrationStatus, a.AttendanceID
            FROM Events e
            LEFT JOIN Registrations r ON e.EventID = r.EventID AND r.ParticipantID = @userId
            LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
            WHERE e.EventID = @eventId
        `;
    const checkResult = await pool
      .request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkQuery);

    if (checkResult.recordset.length === 0)
      return res
        .status(404)
        .json({success: false, message: "Sự kiện không tồn tại."});

    const eventInfo = checkResult.recordset[0];

    // 1. Kiểm tra xem sự kiện đã kết thúc chưa
    if (new Date(eventInfo.EndDate) > new Date())
      return res.status(403).json({
        success: false,
        message: "Sự kiện chưa kết thúc, chưa thể đánh giá.",
      });

    // 2. Kiểm tra xem user ĐÃ ĐĂNG KÝ (Registered) chưa
    if (eventInfo.RegistrationStatus !== "Registered")
      return res.status(403).json({
        success: false,
        message: "Bạn phải đăng ký tham gia sự kiện mới được quyền đánh giá.",
      });

    // 3. Kiểm tra xem user đã CHECK-IN chưa
    if (!eventInfo.AttendanceID)
      return res.status(403).json({
        success: false,
        message: "Bạn phải check-in tham gia sự kiện thành công thì mới được quyền đánh giá.",
      });

    // 4. Kiểm tra xem user đã đánh giá chưa
    const checkFeedbackQuery = `SELECT FeedbackID FROM Feedbacks WHERE EventID = @eventId AND ParticipantID = @userId`;
    const feedbackResult = await pool
      .request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .query(checkFeedbackQuery);

    if (feedbackResult.recordset.length > 0) {
      return res.status(403).json({
        success: false,
        message: "Bạn đã đánh giá sự kiện này rồi.",
      });
    }

    res.status(200).json({success: true, message: "Đủ điều kiện đánh giá."});
  } catch (error) {
    res
      .status(500)
      .json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const userId = req.user.UserID;
    const pool = getPool();
    const result = await pool.request()
      .input("feedbackId", sql.Int, feedbackId)
      .input("userId", sql.Int, userId)
      .query(`DELETE FROM Feedbacks WHERE FeedbackID = @feedbackId AND ParticipantID = @userId`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({success: false, message: "Không tìm thấy đánh giá hoặc bạn không có quyền xóa."});
    res.status(200).json({success: true, message: "Đã xóa đánh giá thành công."});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.replyFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const {reply} = req.body;
    const userId = req.user.UserID;
    const pool = getPool();

    // Check if user is organizer of this event
    const eventResult = await pool.request().input("eventId", sql.Int, eventId).input("userId", sql.Int, userId)
      .query(`SELECT EventID FROM Events WHERE EventID = @eventId AND OrganizerID = @userId`);
    
    if (eventResult.recordset.length === 0) return res.status(403).json({success: false, message: "Bạn không có quyền trả lời đánh giá này."});

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
    
    res.status(200).json({success: true, message: "Đã gửi câu trả lời."});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.reportFeedback = async (req, res) => {
  try {
    const {eventId, feedbackId} = req.params;
    const {reason} = req.body;
    const userId = req.user.UserID;
    const pool = getPool();

    // Verify Organizer
    const eventResult = await pool.request().input("eventId", sql.Int, eventId).input("userId", sql.Int, userId)
      .query(`SELECT EventID FROM Events WHERE EventID = @eventId AND OrganizerID = @userId`);
    if (eventResult.recordset.length === 0) return res.status(403).json({success: false, message: "Bạn không có quyền thao tác."});

    await pool.request()
      .input("feedbackId", sql.Int, feedbackId)
      .input("reason", sql.NVarChar, reason)
      .input("userId", sql.Int, userId)
      .query(`UPDATE Feedbacks SET IsReported = 1, ReportReason = @reason, ReportedAt = GETDATE(), ReportedBy = @userId WHERE FeedbackID = @feedbackId`);
    
    res.status(200).json({success: true, message: "Đã báo cáo đánh giá lên Admin."});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.getReportedFeedbacks = async (req, res) => {
  try {
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
    res.status(200).json({success: true, data: result.recordset});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const {feedbackId} = req.params;
    const {action} = req.body; // 'delete' or 'dismiss'
    const pool = getPool();

    if (action === 'delete') {
      await pool.request().input("feedbackId", sql.Int, feedbackId)
        .query(`DELETE FROM Feedbacks WHERE FeedbackID = @feedbackId`);
      res.status(200).json({success: true, message: "Đã xóa đánh giá vi phạm."});
    } else {
      await pool.request().input("feedbackId", sql.Int, feedbackId)
        .query(`UPDATE Feedbacks SET IsReported = 0, ReportReason = NULL, ReportedAt = NULL, ReportedBy = NULL WHERE FeedbackID = @feedbackId`);
      res.status(200).json({success: true, message: "Đã bỏ qua báo cáo."});
    }
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};
