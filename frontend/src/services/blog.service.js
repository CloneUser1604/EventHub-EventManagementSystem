import api from '../utils/axiosConfig';

export const blogService = {
  getBlogs: (params) => api.get('/blogs', { params }),
  getBlogById: (id) => api.get(`/blogs/${id}`),
  createBlog: (data) => api.post('/blogs', data),
  deleteBlog: (id) => api.delete(`/blogs/${id}`),
  votePoll: (id, optionIndex) => api.post(`/blogs/${id}/vote`, { optionIndex }),
  likeBlog: (id) => api.post(`/blogs/${id}/like`),
  getComments: (id, sort = 'new') => api.get(`/blogs/${id}/comments`, { params: { sort } }),
  addComment: (id, formData) => api.post(`/blogs/${id}/comments`, formData),
  editComment: (id, data) => api.put(`/blogs/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/blogs/comments/${id}`),
  likeComment: (id) => api.post(`/blogs/comments/${id}/like`),
  getSavedBlogs: (params) => api.get('/blogs/me/saved', { params }),
  saveBlog: (id) => api.post(`/blogs/${id}/save`),
  getNotifications: () => api.get('/blogs/me/notifications'),
  reportBlog: (id, reason) => api.post(`/blogs/${id}/report`, { reason }),
  getReportedBlogs: () => api.get('/blogs/admin/reported'),
  resolveReportedBlog: (id, action, reason) => api.put(`/blogs/admin/reported/${id}/resolve`, { action, reason }),
  reportComment: (id, reason) => api.post(`/blogs/comments/${id}/report`, { reason }),
  getReportedComments: () => api.get('/blogs/admin/reported-comments'),
  resolveReportedComment: (id, action) => api.put(`/blogs/admin/reported-comments/${id}/resolve`, { action }),
};
