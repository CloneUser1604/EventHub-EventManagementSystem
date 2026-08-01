const express = require('express');
const router = express.Router();
const { getBlogs, getBlogById, createBlog, deleteBlog, votePoll, likeBlog, getComments, addComment, likeComment, getNotifications, editComment, deleteComment, toggleSaveBlog, getSavedBlogs, reportBlog, getReportedBlogs, resolveReportedBlog, reportComment, getReportedComments, resolveReportedComment } = require('../controllers/blog.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadBlog } = require('../middleware/upload');

// Protected routes (static paths must come before dynamic ones)
// [Lấy thông báo] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/me/notifications', authenticate, getNotifications);
// [Lấy Blog đã lưu] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/me/saved', authenticate, getSavedBlogs);

// Admin routes for reports
// [Lấy Blog bị báo cáo] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/admin/reported', authenticate, authorize('Admin'), getReportedBlogs);
// [Giải quyết báo cáo Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.put('/admin/reported/:id/resolve', authenticate, authorize('Admin'), resolveReportedBlog);
// [Lấy bình luận bị báo cáo] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/admin/reported-comments', authenticate, authorize('Admin'), getReportedComments);
// [Giải quyết báo cáo bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.put('/admin/reported-comments/:id/resolve', authenticate, authorize('Admin'), resolveReportedComment);

// Public routes
// [Lấy danh sách Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/', getBlogs);
// [Lấy chi tiết Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/:id', getBlogById);

// The controller will further check specific permissions based on eventId
// [Tạo Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/', authenticate, uploadBlog.array('images', 10), createBlog);

// Vote poll
// [Bình chọn Poll] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/:id/vote', authenticate, votePoll);

// Tương tác (Like & Comment)
// [Thích Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/:id/like', authenticate, likeBlog);
// [Lưu hoặc bỏ lưu Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/:id/save', authenticate, toggleSaveBlog);
// [Báo cáo Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/:id/report', authenticate, reportBlog);
// [Lấy danh sách bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.get('/:id/comments', getComments);
// [Thêm bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/:id/comments', authenticate, uploadBlog.array('images', 5), addComment);
// [Chỉnh sửa bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.put('/comments/:id', authenticate, uploadBlog.array('images', 5), editComment);
// [Xóa bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.delete('/comments/:id', authenticate, deleteComment);
// [Thích bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/comments/:id/like', authenticate, likeComment);
// [Báo cáo bình luận] Từ Frontend -> gọi Middleware -> gọi Controller
router.post('/comments/:id/report', authenticate, reportComment);

// Only author or Admin can delete
// [Xóa Blog] Từ Frontend -> gọi Middleware -> gọi Controller
router.delete('/:id', authenticate, deleteBlog);

module.exports = router;
