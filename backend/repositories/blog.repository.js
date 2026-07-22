const { getPool, sql } = require('../config/db');

class BlogRepository {
  // ─── GET BLOGS COUNT ──────────────────────────────────────────────
async getBlogsCount(whereClause, params) {
    const pool = getPool();
    const r = pool.request();
    params.forEach(p => r.input(p.name, p.type, p.value));
    const countResult = await r.query(`SELECT COUNT(*) AS Total FROM Blogs b WHERE ${whereClause}`);
    return countResult.recordset[0]?.Total || 0;
  }

  // ─── GET BLOGS ──────────────────────────────────────────────
async getBlogs(whereClause, params, orderClause, offset, limit) {
    const pool = getPool();
    const r = pool.request();
    params.forEach(p => r.input(p.name, p.type, p.value));
    r.input('Offset', sql.Int, offset);
    r.input('Limit', sql.Int, parseInt(limit));
    const result = await r.query(`
      SELECT * FROM (
        SELECT 
          b.BlogID, b.Title, b.Content, b.CoverURL, b.Images, b.PollQuestion, b.PollOptions, b.PublishedAt, b.CreatedAt,
          u.UserID AS AuthorID, u.FullName AS AuthorName, u.AvatarURL AS AuthorAvatar, u.Role AS AuthorRole,
          e.EventID, e.Title AS EventTitle, e.Status AS EventStatus, e.EndDate AS EventEndDate, e.RegistrationDeadline AS EventRegistrationDeadline,
          (SELECT COUNT(*) FROM BlogLikes WHERE BlogID = b.BlogID) AS LikeCount,
          (SELECT COUNT(*) FROM BlogComments WHERE BlogID = b.BlogID) AS CommentCount
        FROM Blogs b
        JOIN Users u ON b.AuthorID = u.UserID
        LEFT JOIN Events e ON b.EventID = e.EventID
        WHERE ${whereClause}
      ) AS T
      ${orderClause}
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
    `);
    return result.recordset;
  }

  async getBlogPollVotesByBlogIds(blogIds) {
    const pool = getPool();
    const votesResult = await pool.request().query(`
      SELECT BlogID, OptionIndex, COUNT(*) as VoteCount
      FROM BlogPollVotes
      WHERE BlogID IN (${blogIds})
      GROUP BY BlogID, OptionIndex
    `);
    return votesResult.recordset;
  }

  async getUserPollVotes(blogIds, userId) {
    const pool = getPool();
    const userVotes = await pool.request().input('UserID', sql.Int, userId).query(`
      SELECT BlogID, OptionIndex
      FROM BlogPollVotes
      WHERE BlogID IN (${blogIds}) AND UserID = @UserID
    `);
    return userVotes.recordset;
  }

  async getUserBlogLikes(blogIds, userId) {
    const pool = getPool();
    const userLikes = await pool.request().input('UserID', sql.Int, userId).query(`
      SELECT BlogID
      FROM BlogLikes
      WHERE BlogID IN (${blogIds}) AND UserID = @UserID
    `);
    return userLikes.recordset;
  }

  async getUserSavedBlogs(blogIds, userId) {
    const pool = getPool();
    const userSaves = await pool.request().input('UserID', sql.Int, userId).query(`
      SELECT BlogID
      FROM SavedBlogs
      WHERE BlogID IN (${blogIds}) AND UserID = @UserID
    `);
    return userSaves.recordset;
  }

  // ─── GET BLOG BY ID ──────────────────────────────────────────────
async getBlogById(blogId) {
    const pool = getPool();
    const result = await pool.request().input('BlogID', sql.Int, blogId).query(`
      SELECT 
        b.BlogID, b.Title, b.Content, b.CoverURL, b.Images, b.PollQuestion, b.PollOptions, b.PublishedAt, b.CreatedAt,
        u.UserID AS AuthorID, u.FullName AS AuthorName, u.AvatarURL AS AuthorAvatar, u.Role AS AuthorRole,
        e.EventID, e.Title AS EventTitle, e.Status AS EventStatus, e.EndDate AS EventEndDate, e.RegistrationDeadline AS EventRegistrationDeadline,
        (SELECT COUNT(*) FROM BlogLikes WHERE BlogID = b.BlogID) AS LikeCount,
        (SELECT COUNT(*) FROM BlogComments WHERE BlogID = b.BlogID) AS CommentCount
      FROM Blogs b
      JOIN Users u ON b.AuthorID = u.UserID
      LEFT JOIN Events e ON b.EventID = e.EventID
      WHERE b.BlogID = @BlogID AND b.IsPublished = 1
    `);
    return result.recordset[0];
  }

  async getBlogPollVotes(blogId) {
    const pool = getPool();
    const votesResult = await pool.request().input('BlogID', sql.Int, blogId).query(`
      SELECT OptionIndex, COUNT(*) as VoteCount
      FROM BlogPollVotes WHERE BlogID = @BlogID GROUP BY OptionIndex
    `);
    return votesResult.recordset;
  }

  async checkEventExists(eventId) {
    const pool = getPool();
    const eventResult = await pool.request().input('EventID', sql.Int, eventId).query('SELECT OrganizerID FROM Events WHERE EventID = @EventID');
    return eventResult.recordset.length > 0;
  }

  // ─── CREATE BLOG ──────────────────────────────────────────────
async createBlog(authorId, eventId, title, content, imagesJson, pollQuestion, parsedPollOptions) {
    const pool = getPool();
    const insertResult = await pool.request()
      .input('AuthorID', sql.Int, authorId)
      .input('EventID', sql.Int, eventId || null)
      .input('Title', sql.NVarChar, title || '')
      .input('Content', sql.NVarChar, content || '')
      .input('Images', sql.NVarChar, imagesJson)
      .input('PollQuestion', sql.NVarChar, pollQuestion || null)
      .input('PollOptions', sql.NVarChar, parsedPollOptions)
      .input('IsPublished', sql.Bit, 1) // Publish immediately
      .input('PublishedAt', sql.DateTime, new Date())
      .query(`
        INSERT INTO Blogs (AuthorID, EventID, Title, Content, Images, PollQuestion, PollOptions, IsPublished, PublishedAt, CreatedAt, UpdatedAt)
        OUTPUT inserted.BlogID
        VALUES (@AuthorID, @EventID, @Title, @Content, @Images, @PollQuestion, @PollOptions, @IsPublished, @PublishedAt, GETDATE(), GETDATE())
      `);
    return insertResult.recordset[0].BlogID;
  }

  async getBlogAuthor(blogId) {
    const pool = getPool();
    const blogCheck = await pool.request().input('BlogID', sql.Int, blogId).query('SELECT AuthorID FROM Blogs WHERE BlogID = @BlogID');
    return blogCheck.recordset[0]?.AuthorID;
  }

  async deleteBlog(blogId) {
    const pool = getPool();
    await pool.request().input('BlogID', sql.Int, blogId).query('DELETE FROM Blogs WHERE BlogID = @BlogID');
  }

  async getBlogPollOptions(blogId) {
    const pool = getPool();
    const blogCheck = await pool.request().input('BlogID', sql.Int, blogId).query('SELECT PollOptions FROM Blogs WHERE BlogID = @BlogID');
    return blogCheck.recordset[0]?.PollOptions;
  }

  async getUserVote(blogId, userId) {
    const pool = getPool();
    const voteCheck = await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query('SELECT OptionIndex FROM BlogPollVotes WHERE BlogID = @BlogID AND UserID = @UserID');
    return voteCheck.recordset[0]?.OptionIndex;
  }

  async deletePollVote(blogId, userId) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM BlogPollVotes WHERE BlogID = @BlogID AND UserID = @UserID');
  }

  async updatePollVote(blogId, userId, optionIndex) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .input('OptionIndex', sql.Int, optionIndex)
      .query('UPDATE BlogPollVotes SET OptionIndex = @OptionIndex, CreatedAt = GETDATE() WHERE BlogID = @BlogID AND UserID = @UserID');
  }

  async insertPollVote(blogId, userId, optionIndex) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .input('OptionIndex', sql.Int, optionIndex)
      .query('INSERT INTO BlogPollVotes (BlogID, UserID, OptionIndex) VALUES (@BlogID, @UserID, @OptionIndex)');
  }

  async checkBlogLikeExists(blogId, userId) {
    const pool = getPool();
    const checkResult = await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query(`SELECT 1 FROM BlogLikes WHERE BlogID = @BlogID AND UserID = @UserID`);
    return checkResult.recordset.length > 0;
  }

  async deleteBlogLike(blogId, userId) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query(`DELETE FROM BlogLikes WHERE BlogID = @BlogID AND UserID = @UserID`);
  }

  async insertBlogLike(blogId, userId) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query(`INSERT INTO BlogLikes (BlogID, UserID) VALUES (@BlogID, @UserID)`);
  }

  async getComments(blogId, userId, orderClause) {
    const pool = getPool();
    const result = await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT * FROM (
          SELECT c.CommentID, c.Content, c.ImageURL, c.CreatedAt, c.UpdatedAt, c.ParentCommentID,
                 u.UserID AS AuthorID, u.FullName AS AuthorName, u.AvatarURL AS AuthorAvatar, u.Role AS AuthorRole,
                 (SELECT COUNT(*) FROM BlogCommentLikes WHERE CommentID = c.CommentID) AS LikeCount,
                 (SELECT COUNT(*) FROM BlogComments WHERE ParentCommentID = c.CommentID) AS ReplyCount,
                 CAST(CASE WHEN EXISTS (SELECT 1 FROM BlogCommentLikes WHERE CommentID = c.CommentID AND UserID = @UserID) THEN 1 ELSE 0 END AS BIT) AS UserLiked
          FROM BlogComments c
          JOIN Users u ON c.UserID = u.UserID
          WHERE c.BlogID = @BlogID
        ) AS T
        ${orderClause.replace('c.CreatedAt', 'CreatedAt')}
      `);
    return result.recordset;
  }

  async insertComment(blogId, userId, content, parentCommentId, imageUrl) {
    const pool = getPool();
    const result = await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .input('Content', sql.NVarChar, content)
      .input('ParentCommentID', sql.Int, parentCommentId || null)
      .input('ImageURL', sql.NVarChar, imageUrl)
      .query(`
        INSERT INTO BlogComments (BlogID, UserID, Content, ParentCommentID, ImageURL)
        OUTPUT INSERTED.CommentID, INSERTED.Content, INSERTED.CreatedAt, INSERTED.ParentCommentID, INSERTED.ImageURL
        VALUES (@BlogID, @UserID, @Content, @ParentCommentID, @ImageURL)
      `);
    return result.recordset[0];
  }
  
  async getUserInfo(userId) {
    const pool = getPool();
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT UserID AS AuthorID, FullName AS AuthorName, AvatarURL AS AuthorAvatar, Role AS AuthorRole FROM Users WHERE UserID = @UserID`);
    return userResult.recordset[0];
  }

  async checkSavedBlogExists(blogId, userId) {
    const pool = getPool();
    const checkResult = await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query('SELECT 1 FROM SavedBlogs WHERE BlogID = @BlogID AND UserID = @UserID');
    return checkResult.recordset.length > 0;
  }

  async deleteSavedBlog(blogId, userId) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query('DELETE FROM SavedBlogs WHERE BlogID = @BlogID AND UserID = @UserID');
  }

  async insertSavedBlog(blogId, userId) {
    const pool = getPool();
    await pool.request()
      .input('BlogID', sql.Int, blogId)
      .input('UserID', sql.Int, userId)
      .query('INSERT INTO SavedBlogs (BlogID, UserID) VALUES (@BlogID, @UserID)');
  }

  async getSavedBlogs(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT b.*, u.FullName as AuthorName, u.AvatarURL as AuthorAvatar, u.Role as AuthorRole, e.Title as EventTitle,
               (SELECT COUNT(*) FROM BlogLikes WHERE BlogID = b.BlogID) AS LikeCount,
               (SELECT COUNT(*) FROM BlogComments WHERE BlogID = b.BlogID) AS CommentCount,
               CAST(CASE WHEN EXISTS (SELECT 1 FROM BlogLikes WHERE BlogID = b.BlogID AND UserID = @UserID) THEN 1 ELSE 0 END AS BIT) AS UserLiked,
               CAST(1 AS BIT) AS UserSaved
        FROM Blogs b
        JOIN SavedBlogs sb ON b.BlogID = sb.BlogID
        JOIN Users u ON b.AuthorID = u.UserID
        LEFT JOIN Events e ON b.EventID = e.EventID
        WHERE sb.UserID = @UserID
        ORDER BY sb.CreatedAt DESC
      `);
    return result.recordset;
  }

  async getCommentOwner(commentId) {
    const pool = getPool();
    const checkResult = await pool.request()
      .input('CommentID', sql.Int, commentId)
      .query(`SELECT UserID FROM BlogComments WHERE CommentID = @CommentID`);
    return checkResult.recordset[0]?.UserID;
  }

  async updateComment(commentId, content, imageUrl) {
    const pool = getPool();
    await pool.request()
      .input('CommentID', sql.Int, commentId)
      .input('Content', sql.NVarChar, content)
      .input('ImageURL', sql.NVarChar, imageUrl)
      .query(`UPDATE BlogComments SET Content = @Content, ImageURL = @ImageURL, UpdatedAt = GETDATE() WHERE CommentID = @CommentID`);
  }

  async deleteCommentLikes(commentId) {
    const pool = getPool();
    await pool.request().input('ParentID', sql.Int, commentId).query(`
      DELETE FROM BlogCommentLikes WHERE CommentID IN (SELECT CommentID FROM BlogComments WHERE ParentCommentID = @ParentID)
    `);
    await pool.request().input('CommentID', sql.Int, commentId).query(`
      DELETE FROM BlogCommentLikes WHERE CommentID = @CommentID
    `);
  }

  async deleteCommentTree(commentId) {
    const pool = getPool();
    await pool.request().input('ParentID', sql.Int, commentId).query(`
      DELETE FROM BlogComments WHERE ParentCommentID = @ParentID
    `);
    await pool.request().input('CommentID', sql.Int, commentId).query(`
      DELETE FROM BlogComments WHERE CommentID = @CommentID
    `);
  }

  async checkCommentLikeExists(commentId, userId) {
    const pool = getPool();
    const checkResult = await pool.request()
      .input('CommentID', sql.Int, commentId)
      .input('UserID', sql.Int, userId)
      .query(`SELECT 1 FROM BlogCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID`);
    return checkResult.recordset.length > 0;
  }

  async deleteCommentLike(commentId, userId) {
    const pool = getPool();
    await pool.request()
      .input('CommentID', sql.Int, commentId)
      .input('UserID', sql.Int, userId)
      .query(`DELETE FROM BlogCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID`);
  }

  async insertCommentLike(commentId, userId) {
    const pool = getPool();
    await pool.request()
      .input('CommentID', sql.Int, commentId)
      .input('UserID', sql.Int, userId)
      .query(`INSERT INTO BlogCommentLikes (CommentID, UserID) VALUES (@CommentID, @UserID)`);
  }

  async getNotifications(userId) {
    const pool = getPool();
    const query = `
      -- Blog Like
      SELECT 'blog_like' as Type, CAST(bl.UserID AS INT) as ID, u.FullName as ActorName, u.AvatarURL as ActorAvatar, u.Role as ActorRole, b.Title as TargetTitle, b.BlogID as TargetID, bl.CreatedAt, NULL as CommentImageURL, NULL as CommentContent
      FROM BlogLikes bl JOIN Blogs b ON bl.BlogID = b.BlogID JOIN Users u ON bl.UserID = u.UserID
      WHERE b.AuthorID = @Me AND bl.UserID != @Me
      
      UNION ALL
      
      -- Blog Comment (top level)
      SELECT 'blog_comment' as Type, c.CommentID as ID, u.FullName as ActorName, u.AvatarURL as ActorAvatar, u.Role as ActorRole, b.Title as TargetTitle, b.BlogID as TargetID, c.CreatedAt, c.ImageURL as CommentImageURL, c.Content as CommentContent
      FROM BlogComments c JOIN Blogs b ON c.BlogID = b.BlogID JOIN Users u ON c.UserID = u.UserID
      WHERE b.AuthorID = @Me AND c.UserID != @Me AND c.ParentCommentID IS NULL
      
      UNION ALL
      
      -- Comment Reply
      SELECT 'comment_reply' as Type, c.CommentID as ID, u.FullName as ActorName, u.AvatarURL as ActorAvatar, u.Role as ActorRole, parent.Content as TargetTitle, b.BlogID as TargetID, c.CreatedAt, c.ImageURL as CommentImageURL, c.Content as CommentContent
      FROM BlogComments c JOIN BlogComments parent ON c.ParentCommentID = parent.CommentID JOIN Blogs b ON c.BlogID = b.BlogID JOIN Users u ON c.UserID = u.UserID
      WHERE parent.UserID = @Me AND c.UserID != @Me
      
      UNION ALL
      
      -- Comment Like
      SELECT 'comment_like' as Type, cl.LikeID as ID, u.FullName as ActorName, u.AvatarURL as ActorAvatar, u.Role as ActorRole, c.Content as TargetTitle, b.BlogID as TargetID, cl.CreatedAt, NULL as CommentImageURL, NULL as CommentContent
      FROM BlogCommentLikes cl JOIN BlogComments c ON cl.CommentID = c.CommentID JOIN Blogs b ON c.BlogID = b.BlogID JOIN Users u ON cl.UserID = u.UserID
      WHERE c.UserID = @Me AND cl.UserID != @Me
      
      UNION ALL
      
      -- System / Admin Notifications
      SELECT 'system_alert' as Type, NotificationID as ID, N'Hệ thống' as ActorName, NULL as ActorAvatar, 'Admin' as ActorRole, Title as TargetTitle, RelatedID as TargetID, CreatedAt, NULL as CommentImageURL, Message as CommentContent
      FROM Notifications
      WHERE UserID = @Me AND Type = 'General' AND RelatedType IN ('Blog', 'System')
      
      ORDER BY CreatedAt DESC
    `;
    const result = await pool.request().input('Me', sql.Int, userId).query(query);
    return result.recordset;
  }

  async checkBlogExists(blogId) {
    const pool = getPool();
    const blogCheck = await pool.request().input('id', sql.Int, blogId).query(`SELECT BlogID FROM Blogs WHERE BlogID = @id`);
    return blogCheck.recordset.length > 0;
  }

  // Lưu thông tin report vào bảng Reports
  async reportBlog(blogId, reason, userId) {
    const pool = getPool();
    // Check if already reported to avoid unique constraint error
    const check = await pool.request()
      .input('id', sql.Int, blogId)
      .input('userId', sql.Int, userId)
      .query(`SELECT 1 FROM Reports WHERE TargetType = 'Blog' AND TargetID = @id AND ReporterID = @userId`);
    if (check.recordset.length > 0) return;

    await pool.request()
      .input('id', sql.Int, blogId)
      .input('reason', sql.NVarChar, reason)
      .input('userId', sql.Int, userId)
      .query(`INSERT INTO Reports (TargetType, TargetID, ReporterID, Reason, Status, CreatedAt) VALUES ('Blog', @id, @userId, @reason, 'Pending', GETDATE())`);
  }

  async getReportedBlogs() {
    const pool = getPool();
    const query = `
      SELECT b.*, u.FullName as AuthorName, e.Title as EventTitle,
             (SELECT COUNT(*) FROM Reports r WHERE r.TargetType = 'Blog' AND r.TargetID = b.BlogID AND r.Status = 'Pending') as ReportCount,
             (SELECT STRING_AGG(r.Reason, ' | ') FROM Reports r WHERE r.TargetType = 'Blog' AND r.TargetID = b.BlogID AND r.Status = 'Pending') as ReportReason,
             (SELECT MAX(r.CreatedAt) FROM Reports r WHERE r.TargetType = 'Blog' AND r.TargetID = b.BlogID AND r.Status = 'Pending') as ReportedAt
      FROM Blogs b
      JOIN Users u ON b.AuthorID = u.UserID
      LEFT JOIN Events e ON b.EventID = e.EventID
      WHERE EXISTS (SELECT 1 FROM Reports r WHERE r.TargetType = 'Blog' AND r.TargetID = b.BlogID AND r.Status = 'Pending')
      ORDER BY b.CreatedAt DESC
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  }

  async getBlogDataForReport(blogId) {
    const pool = getPool();
    const blogData = await pool.request().input('id', sql.Int, blogId).query('SELECT AuthorID, Title, Content FROM Blogs WHERE BlogID = @id');
    return blogData.recordset[0];
  }

  async getCommentDataForReport(commentId) {
    const pool = getPool();
    const commentData = await pool.request().input('id', sql.Int, commentId).query('SELECT UserID, Content, BlogID FROM BlogComments WHERE CommentID = @id');
    return commentData.recordset[0];
  }

  // Xử lý report blog ở DB
  async resolveBlogReport(blogId, action) {
    const pool = getPool();
    if (action === 'delete') {
      await pool.request().input('id', sql.Int, blogId).query('DELETE FROM Blogs WHERE BlogID = @id');
      await pool.request().input('id', sql.Int, blogId).query(`UPDATE Reports SET Status = 'Resolved' WHERE TargetType = 'Blog' AND TargetID = @id`);
    } else {
      await pool.request().input('id', sql.Int, blogId).query(`UPDATE Reports SET Status = 'Resolved' WHERE TargetType = 'Blog' AND TargetID = @id`);
    }
  }

  // Tạo thông báo hệ thống, phần blog đọc lại ở getNotifications với Type='General' và RelatedType='Blog/System'.
  async insertNotification(userId, title, message, type, relatedId, relatedType) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Title', sql.NVarChar(300), title)
      .input('Message', sql.NVarChar(sql.MAX), message)
      .input('Type', sql.VarChar(30), type)
      .input('RelatedID', sql.Int, relatedId)
      .input('RelatedType', sql.VarChar(50), relatedType)
      .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);
  }

  async checkCommentExists(commentId) {
    const pool = getPool();
    const check = await pool.request().input('id', sql.Int, commentId).query(`SELECT CommentID FROM BlogComments WHERE CommentID = @id`);
    return check.recordset.length > 0;
  }

  // Lưu thông tin report vào bảng Reports
  async reportComment(commentId, reason, userId) {
    const pool = getPool();
    const check = await pool.request()
      .input('id', sql.Int, commentId)
      .input('userId', sql.Int, userId)
      .query(`SELECT 1 FROM Reports WHERE TargetType = 'BlogComment' AND TargetID = @id AND ReporterID = @userId`);
    if (check.recordset.length > 0) return;

    await pool.request()
      .input('id', sql.Int, commentId)
      .input('reason', sql.NVarChar, reason)
      .input('userId', sql.Int, userId)
      .query(`INSERT INTO Reports (TargetType, TargetID, ReporterID, Reason, Status, CreatedAt) VALUES ('BlogComment', @id, @userId, @reason, 'Pending', GETDATE())`);
  }

  async getReportedComments() {
    const pool = getPool();
    const query = `
      SELECT c.*, u.FullName as AuthorName, b.EventID, e.Title as EventTitle,
             (SELECT COUNT(*) FROM Reports r WHERE r.TargetType = 'BlogComment' AND r.TargetID = c.CommentID AND r.Status = 'Pending') as ReportCount,
             (SELECT STRING_AGG(r.Reason, ' | ') FROM Reports r WHERE r.TargetType = 'BlogComment' AND r.TargetID = c.CommentID AND r.Status = 'Pending') as ReportReason,
             (SELECT MAX(r.CreatedAt) FROM Reports r WHERE r.TargetType = 'BlogComment' AND r.TargetID = c.CommentID AND r.Status = 'Pending') as ReportedAt
      FROM BlogComments c
      JOIN Users u ON c.UserID = u.UserID
      JOIN Blogs b ON c.BlogID = b.BlogID
      LEFT JOIN Events e ON b.EventID = e.EventID
      WHERE EXISTS (SELECT 1 FROM Reports r WHERE r.TargetType = 'BlogComment' AND r.TargetID = c.CommentID AND r.Status = 'Pending')
      ORDER BY c.CreatedAt DESC
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  }

  // Xử lý report comment ở DB
  async resolveCommentReport(commentId, action) {
    const pool = getPool();
    if (action === 'delete') {
      await this.deleteCommentLikes(commentId);
      await this.deleteCommentTree(commentId);
      await pool.request().input('id', sql.Int, commentId).query(`UPDATE Reports SET Status = 'Resolved' WHERE TargetType = 'BlogComment' AND TargetID = @id`);
    } else {
      await pool.request().input('id', sql.Int, commentId).query(`UPDATE Reports SET Status = 'Resolved' WHERE TargetType = 'BlogComment' AND TargetID = @id`);
    }
  }
}

module.exports = new BlogRepository();
