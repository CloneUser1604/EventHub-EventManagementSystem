import api from './api';

export const adminService = {
  getPendingOrganizers: () => api.get('/admin/pending-organizers'),
  getAllOrganizers:     () => api.get('/admin/all-organizers'),
  reviewOrganizer: (profileId, action, rejectionReason) =>
    api.post(`/admin/organizers/${profileId}/review`, { action, rejectionReason }),
  
  getPendingSpeakers: () => api.get('/admin/pending-speakers'),
  reviewSpeaker: (speakerId, action, rejectionReason) =>
    api.post(`/admin/speakers/${speakerId}/review`, { action, rejectionReason }),
};