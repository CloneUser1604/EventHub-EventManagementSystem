const blogService = require('../services/blog.service');
const { successResponse, createdResponse, errorResponse, notFoundResponse, forbiddenResponse } = require('../utils/response');

const handleError = (res, error, defaultMsg) => {
  const msg = error.message;
  if (msg.startsWith('NOT_FOUND')) return notFoundResponse(res, msg.split(': ')[1]);
  if (msg.startsWith('BAD_REQUEST')) return errorResponse(res, msg.split(': ')[1], 400);
  if (msg.startsWith('FORBIDDEN')) return forbiddenResponse(res, msg.split(': ')[1]);
  return errorResponse(res, defaultMsg, 500);
};

// ─── GET BLOGS ──────────────────────────────────────────────
const getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, eventId, sort = 'new' } = req.query;
    
    let currentUserId = null;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        currentUserId = decoded.userId;
      } catch (e) {}
    }

    const result = await blogService.getBlogs(page, limit, eventId, sort, currentUserId);
    return successResponse(res, result);
  } catch (error) {
    console.error('Error in getBlogs:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách blog', 500);
  }
};

// ─── GET BLOG BY ID ──────────────────────────────────────────────
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blogService.getBlogById(id);
    return successResponse(res, blog);
  } catch (error) {
    console.error('Error in getBlogById:', error);
    return handleError(res, error, 'Lỗi khi lấy bài viết');
  }
};

// ─── CREATE BLOG ──────────────────────────────────────────────
const createBlog = async (req, res) => {
  try {
    const { title, content, eventId, pollQuestion, pollOptions } = req.body;
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/blogs/${file.filename}`);
    } else if (req.body.coverUrl) {
      images = Array.isArray(req.body.coverUrl) ? req.body.coverUrl : [req.body.coverUrl];
    }
    const imagesJson = images.length > 0 ? JSON.stringify(images) : null;

    let parsedPollOptions = null;
    if (pollOptions) {
      try {
        const parsed = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedPollOptions = JSON.stringify(parsed);
        }
      } catch (e) {
        return errorResponse(res, 'Định dạng Poll Options không hợp lệ', 400);
      }
    }

    const authorId = req.user.UserID;
    const hasMedia = imagesJson !== null;
    const hasPoll = pollQuestion && parsedPollOptions;
    
    if (!title && !content && !hasMedia && !hasPoll) {
      return errorResponse(res, 'Vui lòng nhập tiêu đề, nội dung, ảnh/video hoặc bình chọn', 400);
    }

    const newBlogId = await blogService.createBlog(authorId, eventId, title, content, imagesJson, pollQuestion, parsedPollOptions);
    return createdResponse(res, { BlogID: newBlogId }, 'Đăng bài viết thành công');
  } catch (error) {
    console.error('Error in createBlog:', error);
    return handleError(res, error, 'Lỗi khi tạo bài viết');
  }
};

// ─── DELETE BLOG ──────────────────────────────────────────────
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID;
    const role = req.user.Role;
    
    await blogService.deleteBlog(id, userId, role);
    return successResponse(res, null, 'Đã xóa bài viết thành công');
  } catch (error) {
    console.error('Error in deleteBlog:', error);
    return handleError(res, error, 'Lỗi khi xóa bài viết');
  }
};

// ─── VOTE POLL ──────────────────────────────────────────────
const votePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.UserID;

    await blogService.votePoll(id, userId, optionIndex);
    return successResponse(res, null, 'Bình chọn thành công');
  } catch (error) {
    console.error('Error in votePoll:', error);
    return handleError(res, error, 'Lỗi khi bình chọn');
  }
};

// ─── LIKE BLOG ──────────────────────────────────────────────
const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const liked = await blogService.likeBlog(id, userId);
    return successResponse(res, { liked });
  } catch (error) {
    console.error('Error liking blog:', error);
    return errorResponse(res, 'Lỗi khi like bài viết', 500);
  }
};

// ─── GET COMMENTS ──────────────────────────────────────────────
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { sort } = req.query;
    let userId = 0;
    if (req.headers.authorization) {
       const token = req.headers.authorization.split(' ')[1];
       try {
         const { verifyAccessToken } = require('../utils/jwt');
         const decoded = verifyAccessToken(token);
         userId = decoded.userId;
       } catch (e) {}
    }

    const result = await blogService.getComments(id, userId, sort);
    return successResponse(res, result);
  } catch (error) {
    console.error('Error getting comments:', error);
    return errorResponse(res, 'Lỗi khi lấy bình luận', 500);
  }
};

// ─── ADD COMMENT ──────────────────────────────────────────────
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
    
    const comment = await blogService.addComment(id, userId, content, parentCommentId, imageUrl);
    return createdResponse(res, comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return handleError(res, error, 'Lỗi khi thêm bình luận');
  }
};

// ─── TOGGLE SAVE BLOG ──────────────────────────────────────────────
const toggleSaveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const saved = await blogService.toggleSaveBlog(id, userId);
    return successResponse(res, { saved }, saved ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết');
  } catch (error) {
    console.error('Error saving blog:', error);
    return errorResponse(res, 'Lỗi khi lưu bài viết', 500);
  }
};

// ─── GET SAVED BLOGS ──────────────────────────────────────────────
const getSavedBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.UserID || req.user.userId;
    const result = await blogService.getSavedBlogs(userId, page, limit);
    return successResponse(res, result);
  } catch (error) {
    console.error('Error getting saved blogs:', error);
    return errorResponse(res, 'Lỗi khi lấy bài viết đã lưu', 500);
  }
};

// ─── EDIT COMMENT ──────────────────────────────────────────────
const editComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, existingImages } = req.body;
    const userId = req.user.UserID || req.user.userId;
    
    let imageUrlArray = [];
    if (existingImages) {
      // If only one existing image string is sent, it might be a string instead of an array
      imageUrlArray = Array.isArray(existingImages) ? existingImages : [existingImages];
    }
    
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `${req.protocol}://${req.get('host')}/uploads/blogs/${f.filename}`);
      imageUrlArray = [...imageUrlArray, ...newImages];
    } else if (req.file) {
      imageUrlArray.push(`${req.protocol}://${req.get('host')}/uploads/blogs/${req.file.filename}`);
    }
    
    // Convert to JSON string if there are images, else keep null
    let imageUrl = imageUrlArray.length > 0 ? JSON.stringify(imageUrlArray) : null;
    
    await blogService.editComment(id, userId, content, imageUrl);
    return successResponse(res, null, 'Cập nhật bình luận thành công');
  } catch (error) {
    console.error('Error editing comment:', error);
    return handleError(res, error, 'Lỗi khi chỉnh sửa bình luận');
  }
};

// ─── DELETE COMMENT ──────────────────────────────────────────────
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const role = req.user.Role;
    
    await blogService.deleteComment(id, userId, role);
    return successResponse(res, null, 'Xoá bình luận thành công');
  } catch (error) {
    console.error('Error deleting comment:', error);
    return handleError(res, error, 'Lỗi khi xoá bình luận');
  }
};

// ─── LIKE COMMENT ──────────────────────────────────────────────
const likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.UserID || req.user.userId;
    const liked = await blogService.likeComment(id, userId);
    return successResponse(res, { liked });
  } catch (error) {
    console.error('Error liking comment:', error);
    return errorResponse(res, 'Lỗi khi like bình luận', 500);
  }
};

// ─── GET NOTIFICATIONS ──────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.UserID || req.user.userId;
    const result = await blogService.getNotifications(userId);
    return successResponse(res, result);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return errorResponse(res, 'Lỗi khi lấy thông báo', 500);
  }
};

// ─── REPORT BLOG ──────────────────────────────────────────────
// Người dùng báo cáo bài viết: controller chỉ lấy id/reason/userId, service kiểm tra tồn tại rồi repository cập nhật Blogs.
const reportBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return errorResponse(res, 'Vui lòng nhập lý do báo cáo', 400);
    }
    
    const userId = req.user.UserID || req.user.userId;

    await blogService.reportBlog(id, reason, userId);
    return successResponse(res, { success: true, message: 'Đã gửi báo cáo thành công' });
  } catch (error) {
    console.error('Error reporting blog:', error);
    return handleError(res, error, 'Lỗi khi báo cáo bài viết');
  }
};

// Admin lấy danh sách bài viết bị report để hiển thị trong AdminDashboard.
const getReportedBlogs = async (req, res) => {
  try {
    const result = await blogService.getReportedBlogs();
    return successResponse(res, result);
  } catch (error) {
    console.error('Error getting reported blogs:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách báo cáo', 500);
  }
};

// Admin xử lý report bài viết: action='delete' hoặc 'dismiss', reason dùng khi gửi thông báo xóa bài.
const resolveReportedBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    await blogService.resolveReportedBlog(id, action, reason);
    return successResponse(res, { success: true, message: 'Đã giải quyết báo cáo' });
  } catch (error) {
    console.error('Error resolving blog report:', error);
    return errorResponse(res, 'Lỗi khi giải quyết báo cáo', 500);
  }
};

// Người dùng báo cáo bình luận: lưu lý do vào BlogComments.ReportReason.
const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.UserID || req.user.userId;

    await blogService.reportComment(id, reason, userId);
    return successResponse(res, { success: true, message: 'Đã gửi báo cáo thành công' });
  } catch (error) {
    console.error('Error reporting comment:', error);
    return handleError(res, error, 'Lỗi khi báo cáo bình luận');
  }
};

// Admin lấy danh sách bình luận bị report.
const getReportedComments = async (req, res) => {
  try {
    const result = await blogService.getReportedComments();
    return successResponse(res, result);
  } catch (error) {
    console.error('Error fetching reported comments:', error);
    return errorResponse(res, 'Lỗi khi lấy danh sách báo cáo', 500);
  }
};

// Admin xử lý report bình luận: xóa hoặc bỏ qua tương tự bài viết.
const resolveReportedComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; 
    
    await blogService.resolveReportedComment(id, action);
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
