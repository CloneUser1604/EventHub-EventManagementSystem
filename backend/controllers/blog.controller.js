const { getPool, sql } = require('../config/db');
const {
  successResponse, createdResponse, errorResponse,
  notFoundResponse, forbiddenResponse,
} = require('../utils/response');

// ─── GET ALL BLOGS ───────────────────────────────────────────────
const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, eventId, sort = 'new' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pool = getPool();

    const conditions = ['b.IsPublished = 1'];
    const params = [];

    if (eventId) {
      conditions.push('b.EventID = @EventID');
      params.push({ name: 'EventID', type: sql.Int, value: parseInt(eventId) });
    }

    const whereClause = conditions.join(' AND ');

    const buildRequest = () => {
      const r = pool.request();
      params.forEach(p => r.input(p.name, p.type, p.value));
      return r;
    };

    // Count
    const countResult = await buildRequest()
      .query(`SELECT COUNT(*) AS Total FROM Blogs b WHERE ${whereClause}`);
    const total = countResult.recordset[0]?.Total || 0;

    let orderClause = 'ORDER BY CreatedAt DESC';
    if (sort === 'trending') {
      orderClause = 'ORDER BY (LikeCount + CommentCount) DESC, CreatedAt DESC';
    }

    // Data
    const result = await buildRequest()
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, parseInt(limit))
      .query(`
        SELECT * FROM (
          SELECT 
            b.BlogID, b.Title, b.Content, b.CoverURL, b.Images, b.PollQuestion, b.PollOptions, b.PublishedAt, b.CreatedAt,
            u.UserID AS AuthorID, u.FullName AS AuthorName, u.AvatarURL AS AuthorAvatar, u.Role AS AuthorRole,
            e.EventID, e.Title AS EventTitle,
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

    const blogs = result.recordset;

    // Fetch poll votes if there are blogs
    if (blogs.length > 0) {
      const blogIds = blogs.map(b => b.BlogID).join(',');
      const votesResult = await pool.request().query(`
        SELECT BlogID, OptionIndex, COUNT(*) as VoteCount
        FROM BlogPollVotes
        WHERE BlogID IN (${blogIds})
        GROUP BY BlogID, OptionIndex
      `);
      
      const votesMap = {};
      votesResult.recordset.forEach(v => {
        if (!votesMap[v.BlogID]) votesMap[v.BlogID] = {};
        votesMap[v.BlogID][v.OptionIndex] = v.VoteCount;
      });

      blogs.forEach(b => {
        if (b.PollOptions) {
          try {
            b.PollOptions = JSON.parse(b.PollOptions);
            b.PollVotes = votesMap[b.BlogID] || {};
            // Tạm tính tổng số vote
            b.TotalVotes = Object.values(b.PollVotes).reduce((a, c) => a + c, 0);
          } catch (e) {}
        }
        if (b.Images) {
          try { b.Images = JSON.parse(b.Images); } catch (e) { b.Images = []; }
        }
      });
    }

    // Try to get current user ID from token to return user's votes
    let currentUserId = null;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch (e) {}
    }

    if (currentUserId && blogs.length > 0) {
      const blogIds = blogs.map(b => b.BlogID).join(',');
      const userVotes = await pool.request()
        .input('UserID', sql.Int, currentUserId)
        .query(`
          SELECT BlogID, OptionIndex
          FROM BlogPollVotes
          WHERE BlogID IN (${blogIds}) AND UserID = @UserID
        `);
      const userVoteMap = {};
      userVotes.recordset.forEach(v => { userVoteMap[v.BlogID] = v.OptionIndex; });
      
      const userLikes = await pool.request()
        .input('UserID', sql.Int, currentUserId)
        .query(`
          SELECT BlogID
          FROM BlogLikes
          WHERE BlogID IN (${blogIds}) AND UserID = @UserID
        `);
      const userLikeMap = {};
      userLikes.recordset.forEach(l => { userLikeMap[l.BlogID] = true; });

      const userSaves = await pool.request()
        .input('UserID', sql.Int, currentUserId)
        .query(`
          SELECT BlogID
          FROM SavedBlogs
          WHERE BlogID IN (${blogIds}) AND UserID = @UserID
        `);
      const userSaveMap = {};
      userSaves.recordset.forEach(s => { userSaveMap[s.BlogID] = true; });

      blogs.forEach(b => { 
        b.UserVotedOption = userVoteMap[b.BlogID]; 
        b.UserLiked = userLikeMap[b.BlogID] || false;
        b.UserSaved = userSaveMap[b.BlogID] || false;
      });
    }

    return successResponse(res, {
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getBlogs:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách blog', 500);
  }
};

// ─── GET SINGLE BLOG ─────────────────────────────────────────────
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('BlogID', sql.Int, id)
      .query(`
        SELECT 
          b.BlogID, b.Title, b.Content, b.CoverURL, b.Images, b.PollQuestion, b.PollOptions, b.PublishedAt, b.CreatedAt,
          u.UserID AS AuthorID, u.FullName AS AuthorName, u.AvatarURL AS AuthorAvatar, u.Role AS AuthorRole,
          e.EventID, e.Title AS EventTitle,
          (SELECT COUNT(*) FROM BlogLikes WHERE BlogID = b.BlogID) AS LikeCount,
          (SELECT COUNT(*) FROM BlogComments WHERE BlogID = b.BlogID) AS CommentCount
        FROM Blogs b
        JOIN Users u ON b.AuthorID = u.UserID
        LEFT JOIN Events e ON b.EventID = e.EventID
        WHERE b.BlogID = @BlogID AND b.IsPublished = 1
      `);

    if (result.recordset.length === 0) {
      return notFoundResponse(res, 'Không tìm thấy bài viết');
    }

    const blog = result.recordset[0];
    if (blog.PollOptions) {
      try {
        blog.PollOptions = JSON.parse(blog.PollOptions);
        const votesResult = await pool.request().input('BlogID', sql.Int, id).query(`
          SELECT OptionIndex, COUNT(*) as VoteCount
          FROM BlogPollVotes WHERE BlogID = @BlogID GROUP BY OptionIndex
        `);
        blog.PollVotes = {};
        votesResult.recordset.forEach(v => { blog.PollVotes[v.OptionIndex] = v.VoteCount; });
        blog.TotalVotes = Object.values(blog.PollVotes).reduce((a, c) => a + c, 0);
      } catch (e) {}
    }
    if (blog.Images) {
      try { blog.Images = JSON.parse(blog.Images); } catch (e) { blog.Images = []; }
    }

    return successResponse(res, blog);
  } catch (error) {
    console.error('Error in getBlogById:', error);
    return errorResponse(res, 'Lỗi khi lấy bài viết', 500);
  }
};

// ─── CREATE BLOG ────────────────────────────────────────────────
const createBlog = async (req, res) => {
  try {
    const { title, content, eventId, pollQuestion, pollOptions } = req.body;
    
    // Xử lý mảng file ảnh được upload
    console.log('req.files:', req.files); let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/blogs/${file.filename}`);
    } else if (req.body.coverUrl) {
      // Hỗ trợ truyền mảng coverUrl từ client nếu có
      images = Array.isArray(req.body.coverUrl) ? req.body.coverUrl : [req.body.coverUrl];
    }
    const imagesJson = images.length > 0 ? JSON.stringify(images) : null;

    let parsedPollOptions = null;
    if (pollOptions) {
      try {
        // Đảm bảo pollOptions là mảng hợp lệ trước khi lưu
        const parsed = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedPollOptions = JSON.stringify(parsed);
        }
      } catch (e) {
        return errorResponse(res, 'Định dạng Poll Options không hợp lệ', 400);
      }
    }

    const authorId = req.user.UserID;
    const role = req.user.Role;

    if (!title && !content) {
      return errorResponse(res, 'Vui lòng nhập tiêu đề hoặc nội dung', 400);
    }

    const pool = getPool();

    // Check permissions if eventId is provided
    if (eventId) {
      const eventResult = await pool.request()
        .input('EventID', sql.Int, eventId)
        .query('SELECT OrganizerID FROM Events WHERE EventID = @EventID');

      if (eventResult.recordset.length === 0) {
        return notFoundResponse(res, 'Không tìm thấy sự kiện');
      }
    }

    // Insert blog
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

    const newBlogId = insertResult.recordset[0].BlogID;

    return createdResponse(res, { BlogID: newBlogId }, 'Đăng bài viết thành công');
  } catch (error) {
    console.error('Error in createBlog:', error);
    return errorResponse(res, 'Lỗi khi tạo bài viết', 500);
  }
};

// ─── DELETE BLOG ────────────────────────────────────────────────
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID;
    const role = req.user.Role;
    const pool = getPool();

    const blogCheck = await pool.request()
      .input('BlogID', sql.Int, id)
      .query('SELECT AuthorID FROM Blogs WHERE BlogID = @BlogID');

    if (blogCheck.recordset.length === 0) {
      return notFoundResponse(res, 'Không tìm thấy bài viết');
    }

    const authorId = blogCheck.recordset[0].AuthorID;

    if (authorId !== userId && role !== 'Admin') {
      return forbiddenResponse(res, 'Bạn không có quyền xóa bài viết này');
    }

    await pool.request()
      .input('BlogID', sql.Int, id)
      .query('DELETE FROM Blogs WHERE BlogID = @BlogID');

    return successResponse(res, null, 'Đã xóa bài viết thành công');
  } catch (error) {
    console.error('Error in deleteBlog:', error);
    return errorResponse(res, 'Lỗi khi xóa bài viết', 500);
  }
};

// ─── VOTE POLL ────────────────────────────────────────────────
const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.UserID;

    if (optionIndex === undefined || optionIndex === null) {
      return errorResponse(res, 'Vui lòng chọn một đáp án', 400);
    }

    const pool = getPool();

    // Check if blog exists and has poll
    const blogCheck = await pool.request()
      .input('BlogID', sql.Int, id)
      .query('SELECT PollOptions FROM Blogs WHERE BlogID = @BlogID');

    if (blogCheck.recordset.length === 0) {
      return notFoundResponse(res, 'Không tìm thấy bài viết');
    }
    
    if (!blogCheck.recordset[0].PollOptions) {
      return errorResponse(res, 'Bài viết này không có cuộc thăm dò ý kiến', 400);
    }

    // Check if already voted
    const voteCheck = await pool.request()
      .input('BlogID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .query('SELECT VoteID FROM BlogPollVotes WHERE BlogID = @BlogID AND UserID = @UserID');
      
    if (voteCheck.recordset.length > 0) {
      // Bỏ phiếu lại (update)
      await pool.request()
        .input('BlogID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .input('OptionIndex', sql.Int, optionIndex)
        .query('UPDATE BlogPollVotes SET OptionIndex = @OptionIndex, CreatedAt = GETDATE() WHERE BlogID = @BlogID AND UserID = @UserID');
    } else {
      // Bỏ phiếu mới (insert)
      await pool.request()
        .input('BlogID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .input('OptionIndex', sql.Int, optionIndex)
        .query('INSERT INTO BlogPollVotes (BlogID, UserID, OptionIndex) VALUES (@BlogID, @UserID, @OptionIndex)');
    }

    return successResponse(res, null, 'Bình chọn thành công');
  } catch (error) {
    console.error('Error in votePoll:', error);
    return errorResponse(res, 'Lỗi khi bình chọn', 500);
  }
};

const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();
    
    // Check if like exists
    const checkResult = await pool.request()
      .input('BlogID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .query(`SELECT 1 FROM BlogLikes WHERE BlogID = @BlogID AND UserID = @UserID`);
      
    if (checkResult.recordset.length > 0) {
      // Unlike
      await pool.request()
        .input('BlogID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .query(`DELETE FROM BlogLikes WHERE BlogID = @BlogID AND UserID = @UserID`);
      return successResponse(res, { liked: false });
    } else {
      // Like
      await pool.request()
        .input('BlogID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .query(`INSERT INTO BlogLikes (BlogID, UserID) VALUES (@BlogID, @UserID)`);
      return successResponse(res, { liked: true });
    }
  } catch (error) {
    console.error('Error liking blog:', error);
    return errorResponse(res, 'Lỗi khi like bài viết', 500);
  }
};

const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { sort } = req.query;
    // Extract userId safely since getComments is public but we want userLiked status if logged in
    let userId = 0;
    if (req.headers.authorization) {
       const token = req.headers.authorization.split(' ')[1];
       try {
         const { verifyAccessToken } = require('../utils/jwt');
         const decoded = verifyAccessToken(token);
         userId = decoded.userId;
       } catch (e) {}
    }

    const pool = getPool();
    
    let orderClause = 'ORDER BY c.CreatedAt DESC';
    if (sort === 'top') {
      orderClause = 'ORDER BY LikeCount DESC, c.CreatedAt DESC';
    }

    const result = await pool.request()
      .input('BlogID', sql.Int, id)
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
      
    return successResponse(res, result.recordset);
  } catch (error) {
    console.error('Error getting comments:', error);
    return errorResponse(res, 'Lỗi khi lấy bình luận', 500);
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.UserID || req.user.userId;
    
    let imageUrl = null;
    if (req.files && req.files.length > 0) {
      imageUrl = JSON.stringify(req.files.map(f => `${req.protocol}://${req.get('host')}/uploads/blogs/${f.filename}`));
    } else if (req.file) {
      imageUrl = JSON.stringify([`${req.protocol}://${req.get('host')}/uploads/blogs/${req.file.filename}`]);
    }
    
    if ((!content || !content.trim()) && !imageUrl) {
      return errorResponse(res, 'Nội dung bình luận không được để trống', 400);
    }
    
    const pool = getPool();
    const result = await pool.request()
      .input('BlogID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .input('Content', sql.NVarChar, content)
      .input('ParentCommentID', sql.Int, parentCommentId || null)
      .input('ImageURL', sql.NVarChar, imageUrl)
      .query(`
        INSERT INTO BlogComments (BlogID, UserID, Content, ParentCommentID, ImageURL)
        OUTPUT INSERTED.CommentID, INSERTED.Content, INSERTED.CreatedAt, INSERTED.ParentCommentID, INSERTED.ImageURL
        VALUES (@BlogID, @UserID, @Content, @ParentCommentID, @ImageURL)
      `);
      
    const comment = result.recordset[0];
    
    // Get user info to return
    const userResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT UserID AS AuthorID, FullName AS AuthorName, AvatarURL AS AuthorAvatar, Role AS AuthorRole FROM Users WHERE UserID = @UserID`);
      
    return createdResponse(res, { ...comment, ...userResult.recordset[0] });
  } catch (error) {
    console.error('Error adding comment:', error);
    return errorResponse(res, 'Lỗi khi thêm bình luận', 500);
  }
};

const toggleSaveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();
    
    const checkResult = await pool.request()
      .input('BlogID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .query('SELECT SavedID FROM SavedBlogs WHERE BlogID = @BlogID AND UserID = @UserID');
      
    if (checkResult.recordset.length > 0) {
      await pool.request()
        .input('SavedID', sql.Int, checkResult.recordset[0].SavedID)
        .query('DELETE FROM SavedBlogs WHERE SavedID = @SavedID');
      return successResponse(res, { saved: false }, 'Đã bỏ lưu bài viết');
    } else {
      await pool.request()
        .input('BlogID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .query('INSERT INTO SavedBlogs (BlogID, UserID) VALUES (@BlogID, @UserID)');
      return successResponse(res, { saved: true }, 'Đã lưu bài viết');
    }
  } catch (error) {
    console.error('Error saving blog:', error);
    return errorResponse(res, 'Lỗi khi lưu bài viết', 500);
  }
};

const getSavedBlogs = async (req, res) => {
  try {
    const userId = req.user.UserID || req.user.userId;
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
      
    const blogs = result.recordset.map(blog => {
      if (blog.Images) {
        try { blog.Images = JSON.parse(blog.Images); } catch (e) { blog.Images = []; }
      }
      return blog;
    });
      
    return successResponse(res, blogs);
  } catch (error) {
    console.error('Error getting saved blogs:', error);
    return errorResponse(res, 'Lỗi khi lấy bài viết đã lưu', 500);
  }
};

const editComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.UserID || req.user.userId;
    
    if (!content || !content.trim()) {
      return errorResponse(res, 'Nội dung bình luận không được để trống', 400);
    }
    
    const pool = getPool();
    // Verify ownership
    const checkResult = await pool.request()
      .input('CommentID', sql.Int, id)
      .query(`SELECT UserID FROM BlogComments WHERE CommentID = @CommentID`);
      
    if (checkResult.recordset.length === 0) {
      return notFoundResponse(res, 'Không tìm thấy bình luận');
    }
    if (checkResult.recordset[0].UserID !== userId) {
      return errorResponse(res, 'Không có quyền chỉnh sửa bình luận này', 403);
    }
    
    await pool.request()
      .input('CommentID', sql.Int, id)
      .input('Content', sql.NVarChar, content)
      .query(`UPDATE BlogComments SET Content = @Content, UpdatedAt = GETDATE() WHERE CommentID = @CommentID`);
      
    return successResponse(res, null, 'Cập nhật bình luận thành công');
  } catch (error) {
    console.error('Error editing comment:', error);
    return errorResponse(res, 'Lỗi khi chỉnh sửa bình luận', 500);
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();
    
    // Verify ownership
    const checkResult = await pool.request()
      .input('CommentID', sql.Int, id)
      .query(`SELECT UserID FROM BlogComments WHERE CommentID = @CommentID`);
      
    if (checkResult.recordset.length === 0) {
      return notFoundResponse(res, 'Không tìm thấy bình luận');
    }
    if (checkResult.recordset[0].UserID !== userId && req.user.Role !== 'Admin') {
      return errorResponse(res, 'Không có quyền xoá bình luận này', 403);
    }
    
    // Delete likes of replies
    await pool.request().input('ParentID', sql.Int, id).query(`
      DELETE FROM BlogCommentLikes WHERE CommentID IN (SELECT CommentID FROM BlogComments WHERE ParentCommentID = @ParentID)
    `);
    
    // Delete likes of the parent comment
    await pool.request().input('CommentID', sql.Int, id).query(`
      DELETE FROM BlogCommentLikes WHERE CommentID = @CommentID
    `);
    
    // Delete replies
    await pool.request().input('ParentID', sql.Int, id).query(`
      DELETE FROM BlogComments WHERE ParentCommentID = @ParentID
    `);
    
    // Delete the comment itself
    await pool.request().input('CommentID', sql.Int, id).query(`
      DELETE FROM BlogComments WHERE CommentID = @CommentID
    `);
    
    return successResponse(res, null, 'Xoá bình luận thành công');
  } catch (error) {
    console.error('Error deleting comment:', error);
    return errorResponse(res, 'Lỗi khi xoá bình luận', 500);
  }
};

const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();
    
    const checkResult = await pool.request()
      .input('CommentID', sql.Int, id)
      .input('UserID', sql.Int, userId)
      .query(`SELECT 1 FROM BlogCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID`);
      
    if (checkResult.recordset.length > 0) {
      await pool.request()
        .input('CommentID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .query(`DELETE FROM BlogCommentLikes WHERE CommentID = @CommentID AND UserID = @UserID`);
      return successResponse(res, { liked: false });
    } else {
      await pool.request()
        .input('CommentID', sql.Int, id)
        .input('UserID', sql.Int, userId)
        .query(`INSERT INTO BlogCommentLikes (CommentID, UserID) VALUES (@CommentID, @UserID)`);
      return successResponse(res, { liked: true });
    }
  } catch (error) {
    console.error('Error liking comment:', error);
    return errorResponse(res, 'Lỗi khi like bình luận', 500);
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.UserID || req.user.userId;
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
      
      ORDER BY CreatedAt DESC
    `;
    const result = await pool.request().input('Me', sql.Int, userId).query(query);
    return successResponse(res, result.recordset);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return errorResponse(res, 'Lỗi khi lấy thông báo', 500);
  }
};

const reportBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();

    const blogCheck = await pool.request().input('id', sql.Int, id).query(`SELECT BlogID FROM Blogs WHERE BlogID = @id`);
    if (blogCheck.recordset.length === 0) return errorResponse(res, 'Không tìm thấy bài viết', 404);

    await pool.request()
      .input('id', sql.Int, id)
      .input('reason', sql.NVarChar, reason)
      .input('userId', sql.Int, userId)
      .query(`UPDATE Blogs SET IsReported = 1, ReportReason = @reason, ReportedAt = GETDATE(), ReportedBy = @userId WHERE BlogID = @id`);

    return successResponse(res, { success: true, message: 'Đã gửi báo cáo thành công' });
  } catch (error) {
    console.error('Error reporting blog:', error);
    return errorResponse(res, 'Lỗi khi báo cáo bài viết', 500);
  }
};

const getReportedBlogs = async (req, res) => {
  try {
    const pool = getPool();
    const query = `
      SELECT b.*, u.FullName as AuthorName, r.FullName as ReporterName, e.Title as EventTitle
      FROM Blogs b
      JOIN Users u ON b.AuthorID = u.UserID
      LEFT JOIN Users r ON b.ReportedBy = r.UserID
      LEFT JOIN Events e ON b.EventID = e.EventID
      WHERE b.IsReported = 1
      ORDER BY b.ReportedAt DESC
    `;
    const result = await pool.request().query(query);
    return successResponse(res, result.recordset);
  } catch (error) {
    console.error('Error getting reported blogs:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách báo cáo', 500);
  }
};

const resolveReportedBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    
    // Clear report flag
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE Blogs SET IsReported = 0, ReportReason = NULL, ReportedAt = NULL, ReportedBy = NULL WHERE BlogID = @id`);
      
    return successResponse(res, { success: true, message: 'Đã giải quyết báo cáo' });
  } catch (error) {
    console.error('Error resolving blog report:', error);
    return errorResponse(res, 'Lỗi khi giải quyết báo cáo', 500);
  }
};

const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.UserID || req.user.userId;
    const pool = getPool();

    const check = await pool.request().input('id', sql.Int, id).query(`SELECT CommentID FROM BlogComments WHERE CommentID = @id`);
    if (check.recordset.length === 0) return errorResponse(res, 'Không tìm thấy bình luận', 404);

    await pool.request()
      .input('id', sql.Int, id)
      .input('reason', sql.NVarChar, reason)
      .input('userId', sql.Int, userId)
      .query(`UPDATE BlogComments SET IsReported = 1, ReportReason = @reason, ReportedAt = GETDATE(), ReportedBy = @userId WHERE CommentID = @id`);

    return successResponse(res, { success: true, message: 'Đã gửi báo cáo thành công' });
  } catch (error) {
    console.error('Error reporting comment:', error);
    return errorResponse(res, 'Lỗi khi báo cáo bình luận', 500);
  }
};

const getReportedComments = async (req, res) => {
  try {
    const pool = getPool();
    const query = `
      SELECT c.*, u.FullName as AuthorName, r.FullName as ReporterName, b.EventID, e.Title as EventTitle
      FROM BlogComments c
      JOIN Users u ON c.UserID = u.UserID
      LEFT JOIN Users r ON c.ReportedBy = r.UserID
      JOIN Blogs b ON c.BlogID = b.BlogID
      LEFT JOIN Events e ON b.EventID = e.EventID
      WHERE c.IsReported = 1
      ORDER BY c.ReportedAt DESC
    `;
    const result = await pool.request().query(query);
    return successResponse(res, result.recordset);
  } catch (error) {
    console.error('Error fetching reported comments:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách báo cáo', 500);
  }
};

const resolveReportedComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // dismiss or delete is handled by deleteComment usually, but if action is dismiss
    const pool = getPool();
    
    if (action === 'delete') {
      // Delete likes of replies
      await pool.request().input('ParentID', sql.Int, id).query(`DELETE FROM BlogCommentLikes WHERE CommentID IN (SELECT CommentID FROM BlogComments WHERE ParentCommentID = @ParentID)`);
      // Delete likes of the parent comment
      await pool.request().input('id', sql.Int, id).query(`DELETE FROM BlogCommentLikes WHERE CommentID = @id`);
      // Delete replies
      await pool.request().input('ParentID', sql.Int, id).query(`DELETE FROM BlogComments WHERE ParentCommentID = @ParentID`);
      // Delete the comment itself
      await pool.request().input('id', sql.Int, id).query('DELETE FROM BlogComments WHERE CommentID = @id');
    } else {
      await pool.request().input('id', sql.Int, id).query(`UPDATE BlogComments SET IsReported = 0, ReportReason = NULL, ReportedAt = NULL, ReportedBy = NULL WHERE CommentID = @id`);
    }
      
    return successResponse(res, { success: true, message: 'Đã giải quyết báo cáo' });
  } catch (error) {
    console.error('Error resolving comment report:', error);
    return errorResponse(res, 'Lỗi khi giải quyết báo cáo', 500);
  }
};

module.exports = {
  likeBlog, getComments, addComment, editComment, deleteComment, likeComment, getNotifications, toggleSaveBlog, getSavedBlogs,
  getBlogs,
  getBlogById,
  createBlog,
  deleteBlog,
  votePoll,
  reportBlog,
  getReportedBlogs,
  resolveReportedBlog,
  reportComment,
  getReportedComments,
  resolveReportedComment
};
