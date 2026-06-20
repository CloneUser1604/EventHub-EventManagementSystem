import api from './api';

export const eventService = {
  getEvents: (params) => api.get('/events', { params }),
  getEventById: (id) => api.get(`/events/${id}`),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  submitForApproval: (id) => api.post(`/events/${id}/submit`),
  cancelEvent: (id, reason) => api.post(`/events/${id}/cancel`, { reason }),
  reviewEvent: (id, action, rejectionReason) => {
    if (action === 'approve') return api.post(`/admin/events/${id}/approve`);
    return api.post(`/admin/events/${id}/reject`, { reason: rejectionReason });
  },
  getSessions: (id) => api.get(`/events/${id}/sessions`),
  addSession: (id, data) => api.post(`/events/${id}/sessions`, data),
  updateSession: (id, sessionId, data) => api.put(`/events/${id}/sessions/${sessionId}`, data),
  deleteSession: (id, sessionId) => api.delete(`/events/${id}/sessions/${sessionId}`),
  getCategories: () => api.get('/events/categories'),
  getVenues: () => api.get('/events/venues'),
  getDashboardStats: () => api.get('/events/admin/stats'),
};
