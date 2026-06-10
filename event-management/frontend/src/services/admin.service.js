import api from './api';

export const adminService = {
  getPendingOrganizers: () => api.get('/auth/admin/pending-organizers'),
  getAllOrganizers:     () => api.get('/auth/admin/all-organizers'),
  reviewOrganizer: (profileId, action, rejectionReason) =>
    api.post(`/auth/admin/organizers/${profileId}/review`, { action, rejectionReason }),
  getPendingSpeakers: () => api.get('/auth/admin/pending-speakers'),
  reviewSpeaker: (speakerId, action, rejectionReason) =>
    api.post(`/auth/admin/speakers/${speakerId}/review`, { action, rejectionReason }),
};
