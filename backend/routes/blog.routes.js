const express = require('express');
const router = express.Router();
const { getBlogs, getBlogById, createBlog, deleteBlog, votePoll, likeBlog, getComments, addComment, likeComment, getNotifications, editComment, deleteComment, toggleSaveBlog, getSavedBlogs, reportBlog, getReportedBlogs, resolveReportedBlog, reportComment, getReportedComments, resolveReportedComment } = require('../controllers/blog.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadBlog } = require('../middleware/upload');

// Protected routes (static paths must come before dynamic ones)
router.get('/me/notifications', authenticate, getNotifications);
router.get('/me/saved', authenticate, getSavedBlogs);

// Admin routes for reports
router.get('/admin/reported', authenticate, authorize('Admin'), getReportedBlogs);
router.put('/admin/reported/:id/resolve', authenticate, authorize('Admin'), resolveReportedBlog);
router.get('/admin/reported-comments', authenticate, authorize('Admin'), getReportedComments);
router.put('/admin/reported-comments/:id/resolve', authenticate, authorize('Admin'), resolveReportedComment);

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// The controller will further check specific permissions based on eventId
router.post('/', authenticate, uploadBlog.array('images', 10), createBlog);

// Vote poll
router.post('/:id/vote', authenticate, votePoll);

// Tương tác (Like & Comment)
router.post('/:id/like', authenticate, likeBlog);
router.post('/:id/save', authenticate, toggleSaveBlog);
router.post('/:id/report', authenticate, reportBlog);
router.get('/:id/comments', getComments);
router.post('/:id/comments', authenticate, uploadBlog.array('images', 5), addComment);
router.put('/comments/:id', authenticate, editComment);
router.delete('/comments/:id', authenticate, deleteComment);
router.post('/comments/:id/like', authenticate, likeComment);
router.post('/comments/:id/report', authenticate, reportComment);

// Only author or Admin can delete
router.delete('/:id', authenticate, deleteBlog);

module.exports = router;
