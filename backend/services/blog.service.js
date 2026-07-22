const blogRepository = require('../repositories/blog.repository');
const { sql } = require('../config/db'); // for sql types if needed

class BlogService {
  // ─── GET BLOGS ──────────────────────────────────────────────
async getBlogs(page, limit, eventId, sort, currentUserId) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const conditions = ['b.IsPublished = 1'];
    const params = [];
    if (eventId) {
      conditions.push('b.EventID = @EventID');
      params.push({ name: 'EventID', type: sql.Int, value: parseInt(eventId) });
    }
    const whereClause = conditions.join(' AND ');

    let orderClause = 'ORDER BY CreatedAt DESC';
    if (sort === 'trending') {
      orderClause = 'ORDER BY (LikeCount + CommentCount) DESC, CreatedAt DESC';
    }

    const total = await blogRepository.getBlogsCount(whereClause, params);
    const blogs = await blogRepository.getBlogs(whereClause, params, orderClause, offset, limit);

    if (blogs.length > 0) {
      const blogIds = blogs.map(b => b.BlogID).join(',');
      const votes = await blogRepository.getBlogPollVotesByBlogIds(blogIds);
      
      const votesMap = {};
      votes.forEach(v => {
        if (!votesMap[v.BlogID]) votesMap[v.BlogID] = {};
        votesMap[v.BlogID][v.OptionIndex] = v.VoteCount;
      });

      blogs.forEach(b => {
        if (b.PollOptions) {
          try {
            b.PollOptions = JSON.parse(b.PollOptions);
            b.PollVotes = votesMap[b.BlogID] || {};
            b.TotalVotes = Object.values(b.PollVotes).reduce((a, c) => a + c, 0);
          } catch (e) {}
        }
        if (b.Images) {
          try { b.Images = JSON.parse(b.Images); } catch (e) { b.Images = []; }
        }
      });
      
      if (currentUserId) {
        const userVotes = await blogRepository.getUserPollVotes(blogIds, currentUserId);
        const userVoteMap = {};
        userVotes.forEach(v => { userVoteMap[v.BlogID] = v.OptionIndex; });
        
        const userLikes = await blogRepository.getUserBlogLikes(blogIds, currentUserId);
        const userLikeMap = {};
        userLikes.forEach(l => { userLikeMap[l.BlogID] = true; });

        const userSaves = await blogRepository.getUserSavedBlogs(blogIds, currentUserId);
        const userSaveMap = {};
        userSaves.forEach(s => { userSaveMap[s.BlogID] = true; });

        blogs.forEach(b => { 
          b.UserVotedOption = userVoteMap[b.BlogID]; 
          b.UserLiked = userLikeMap[b.BlogID] || false;
          b.UserSaved = userSaveMap[b.BlogID] || false;
        });
      }
    }

    return {
      data: blogs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  // ─── GET BLOG BY ID ──────────────────────────────────────────────
async getBlogById(blogId) {
    const blog = await blogRepository.getBlogById(blogId);
    if (!blog) throw new Error('NOT_FOUND: Không tìm thấy bài viết');
    
    if (blog.PollOptions) {
      try {
        blog.PollOptions = JSON.parse(blog.PollOptions);
        const votes = await blogRepository.getBlogPollVotes(blogId);
        blog.PollVotes = {};
        votes.forEach(v => { blog.PollVotes[v.OptionIndex] = v.VoteCount; });
        blog.TotalVotes = Object.values(blog.PollVotes).reduce((a, c) => a + c, 0);
      } catch (e) {}
    }
    if (blog.Images) {
      try { blog.Images = JSON.parse(blog.Images); } catch (e) { blog.Images = []; }
    }
    
    return blog;
  }

  async createBlog(title, content, eventId, pollQuestion, pollOptions, files, coverUrl, authorId) {
    let images = [];
    if (files && files.length > 0) {
      images = files.map(file => `/uploads/blogs/${file.filename}`); 
      // Simplified: controller used req.protocol + req.get('host') but relative paths are safer usually, 
      // however since it's already refactored, the controller should pass full paths. 
      // For this refactor, I will pass `images` directly from the controller to match old logic exactly.
    }
    
    if (eventId) {
      const exists = await blogRepository.checkEventExists(eventId);
      if (!exists) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    }
    
    let parsedPollOptions = null;
    if (pollOptions) {
      try {
        const parsed = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedPollOptions = JSON.stringify(parsed);
        }
      } catch (e) {
        throw new Error('BAD_REQUEST: Định dạng Poll Options không hợp lệ');
      }
    }

    // Just throw BAD_REQUEST from controller if title/content is missing.
    // The images will be passed from controller.
  }
  
  // Refactored createBlog proper
  // ─── CREATE BLOG V2 ──────────────────────────────────────────────
async createBlogV2(authorId, eventId, title, content, imagesJson, pollQuestion, parsedPollOptions) {
    if (eventId) {
      const exists = await blogRepository.checkEventExists(eventId);
      if (!exists) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    }
    return await blogRepository.createBlog(authorId, eventId, title, content, imagesJson, pollQuestion, parsedPollOptions);
  }

  async deleteBlog(blogId, userId, role) {
    const authorId = await blogRepository.getBlogAuthor(blogId);
    if (authorId === undefined) throw new Error('NOT_FOUND: Không tìm thấy bài viết');
    if (authorId !== userId && role !== 'Admin') throw new Error('FORBIDDEN: Bạn không có quyền xóa bài viết này');
    await blogRepository.deleteBlog(blogId);
  }

  // ─── VOTE POLL ──────────────────────────────────────────────
async votePoll(blogId, userId, optionIndex) {
    if (optionIndex === undefined || optionIndex === null) throw new Error('BAD_REQUEST: Vui lòng chọn một đáp án');
    
    const pollOptions = await blogRepository.getBlogPollOptions(blogId);
    if (pollOptions === undefined) throw new Error('NOT_FOUND: Không tìm thấy bài viết');
    if (!pollOptions) throw new Error('BAD_REQUEST: Bài viết này không có cuộc thăm dò ý kiến');

    const currentVote = await blogRepository.getUserVote(blogId, userId);
    if (currentVote !== undefined) {
      if (currentVote === optionIndex) {
        // Hủy vote
        await blogRepository.deletePollVote(blogId, userId);
      } else {
        // Đổi vote
        await blogRepository.updatePollVote(blogId, userId, optionIndex);
      }
    } else {
      // Vote mới
      await blogRepository.insertPollVote(blogId, userId, optionIndex);
    }
  }

  async likeBlog(blogId, userId) {
    const exists = await blogRepository.checkBlogLikeExists(blogId, userId);
    if (exists) {
      await blogRepository.deleteBlogLike(blogId, userId);
      return false;
    } else {
      await blogRepository.insertBlogLike(blogId, userId);
      return true;
    }
  }

  async getComments(blogId, userId, sort) {
    let orderClause = 'ORDER BY c.CreatedAt DESC';
    if (sort === 'top') {
      orderClause = 'ORDER BY LikeCount DESC, c.CreatedAt DESC';
    }
    return await blogRepository.getComments(blogId, userId, orderClause);
  }

  // ─── ADD COMMENT ──────────────────────────────────────────────
async addComment(blogId, userId, content, parentCommentId, imageUrl) {
    if ((!content || !content.trim()) && !imageUrl) {
      throw new Error('BAD_REQUEST: Nội dung bình luận không được để trống');
    }
    const comment = await blogRepository.insertComment(blogId, userId, content, parentCommentId, imageUrl);
    const userInfo = await blogRepository.getUserInfo(userId);
    return { ...comment, ...userInfo };
  }

  async toggleSaveBlog(blogId, userId) {
    const exists = await blogRepository.checkSavedBlogExists(blogId, userId);
    if (exists) {
      await blogRepository.deleteSavedBlog(blogId, userId);
      return false;
    } else {
      await blogRepository.insertSavedBlog(blogId, userId);
      return true;
    }
  }

  async getSavedBlogs(userId) {
    const blogs = await blogRepository.getSavedBlogs(userId);
    blogs.forEach(blog => {
      if (blog.Images) {
        try { blog.Images = JSON.parse(blog.Images); } catch (e) { blog.Images = []; }
      }
    });
    return blogs;
  }

  async editComment(commentId, userId, content, imageUrl) {
    if ((!content || !content.trim()) && !imageUrl) throw new Error('BAD_REQUEST: Nội dung bình luận không được để trống');
    
    const ownerId = await blogRepository.getCommentOwner(commentId);
    if (ownerId === undefined) throw new Error('NOT_FOUND: Không tìm thấy bình luận');
    if (String(ownerId) !== String(userId)) throw new Error('FORBIDDEN: Không có quyền chỉnh sửa bình luận này');
    
    await blogRepository.updateComment(commentId, content, imageUrl);
  }

  async deleteComment(commentId, userId, role) {
    const ownerId = await blogRepository.getCommentOwner(commentId);
    if (ownerId === undefined) throw new Error('NOT_FOUND: Không tìm thấy bình luận');
    if (String(ownerId) !== String(userId) && role !== 'Admin') throw new Error('FORBIDDEN: Không có quyền xoá bình luận này');
    
    await blogRepository.deleteCommentLikes(commentId);
    await blogRepository.deleteCommentTree(commentId);
  }

  async likeComment(commentId, userId) {
    const exists = await blogRepository.checkCommentLikeExists(commentId, userId);
    if (exists) {
      await blogRepository.deleteCommentLike(commentId, userId);
      return false;
    } else {
      await blogRepository.insertCommentLike(commentId, userId);
      return true;
    }
  }

  async getNotifications(userId) {
    return await blogRepository.getNotifications(userId);
  }

  // Ghi nhận report bài viết: không xóa ngay, chỉ bật cờ để admin duyệt thủ công.
  async reportBlog(blogId, reason, userId) {
    const exists = await blogRepository.checkBlogExists(blogId);
    if (!exists) throw new Error('NOT_FOUND: Không tìm thấy bài viết');
    await blogRepository.reportBlog(blogId, reason, userId);
  }

  async getReportedBlogs() {
    return await blogRepository.getReportedBlogs();
  }

  // Admin duyệt report bài viết: delete xóa vĩnh viễn và tạo notification, dismiss chỉ reset trạng thái report.
  async resolveReportedBlog(blogId, action, reason) {
    if (action === 'delete') {
      const blog = await blogRepository.getBlogDataForReport(blogId);
      if (blog) {
        await blogRepository.resolveBlogReport(blogId, 'delete');
        const previewContent = blog.Content ? (blog.Content.length > 50 ? blog.Content.substring(0, 50) + '...' : blog.Content) : 'Không có nội dung';
        const msg = `Bài viết "${blog.Title || previewContent}" của bạn đã bị quản trị viên xoá do vi phạm tiêu chuẩn cộng đồng. ${reason ? `Lý do: ${reason}` : ''}`;
        await blogRepository.insertNotification(blog.AuthorID, 'Bài viết bị xoá', msg, 'General', blogId, 'Blog');
      }
    } else {
      await blogRepository.resolveBlogReport(blogId, 'dismiss');
    }
  }

  // Ghi nhận report bình luận vào chính bản ghi BlogComments.
  async reportComment(commentId, reason, userId) {
    const exists = await blogRepository.checkCommentExists(commentId);
    if (!exists) throw new Error('NOT_FOUND: Không tìm thấy bình luận');
    await blogRepository.reportComment(commentId, reason, userId);
  }

  async getReportedComments() {
    return await blogRepository.getReportedComments();
  }

  // Admin duyệt report bình luận: xóa comment tree hoặc giữ lại bằng cách bỏ cờ report.
  async resolveReportedComment(commentId, action) {
    if (action === 'delete') {
      const comment = await blogRepository.getCommentDataForReport(commentId);
      if (comment) {
        await blogRepository.resolveCommentReport(commentId, 'delete');
        const previewContent = comment.Content ? (comment.Content.length > 50 ? comment.Content.substring(0, 50) + '...' : comment.Content) : 'Không có nội dung';
        const msg = `Bình luận "${previewContent}" của bạn đã bị quản trị viên xoá do vi phạm tiêu chuẩn cộng đồng.`;
        await blogRepository.insertNotification(comment.UserID, 'Bình luận bị xoá', msg, 'General', comment.BlogID, 'Blog');
      }
    } else {
      await blogRepository.resolveCommentReport(commentId, 'dismiss');
    }
  }
}

module.exports = new BlogService();
