import api from './api';

export const registrationService = {
  register: (eventId) => api.post('/registrations', { eventId }),
  cancel: (registrationId, note) => api.delete(`/registrations/${registrationId}`, { data: { note } }),
  getMyRegistrations: (status) => api.get('/registrations/my', { params: status ? { status } : {} }),
  getTicket: (registrationId) => api.get(`/registrations/${registrationId}/ticket`),
  getNotifications: () => api.get('/registrations/notifications'),
  markRead: (id) => api.patch(`/registrations/notifications/${id}/read`),
};
