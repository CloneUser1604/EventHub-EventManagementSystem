const {getPool, sql} = require("../config/db");

exports.getEventFeedbacks = async (req, res) => {
  try {
    const {eventId} = req.params;
    const pool = getPool();

        const result = await pool.request().input("eventId", sql.Int, eventId)
      .query(`
                SELECT f.FeedbackID, f.ParticipantID, f.Rating, f.Comment, f.CreatedAt, 
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
    const {rating, comment} = req.body;

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
            INSERT INTO Feedbacks (EventID, ParticipantID, Rating, Comment)
            VALUES (@eventId, @userId, @rating, @comment)
        `;
    await pool
      .request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar, comment || "")
      .query(insertQuery);

    res
      .status(201)
      .json({success: true, message: "Cảm ơn bạn đã đánh giá sự kiện!"});
  } catch (error) {
    if (error.number === 2627)
      return res
        .status(400)
        .json({success: false, message: "Bạn đã đánh giá sự kiện này rồi."});
    res
      .status(500)
      .json({success: false, message: "Lỗi server", error: error.message});
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const {eventId} = req.params;
    const {rating, comment} = req.body;
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
      SET Rating = @rating, Comment = @comment, UpdatedAt = GETDATE()
      WHERE EventID = @eventId AND ParticipantID = @userId
    `;
    await pool.request()
      .input("eventId", sql.Int, eventId)
      .input("userId", sql.Int, userId)
      .input("rating", sql.Int, rating)
      .input("comment", sql.NVarChar, comment || "")
      .query(updateQuery);

    res.status(200).json({success: true, message: "Cập nhật đánh giá thành công!"});
  } catch (error) {
    res.status(500).json({success: false, message: "Lỗi server", error: error.message});
  }
};
