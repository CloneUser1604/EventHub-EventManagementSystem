import api from './api';

export const eventService = {
  createEvent: (data) => api.post('/events', data),
  getMyEvents: () => api.get('/events'),
  getEventDetails: (eventId) => api.get(`/events/${eventId}`),
  registerSpeaker: (eventId, speakerData) => api.post(`/events/${eventId}/speakers`, speakerData),
};
