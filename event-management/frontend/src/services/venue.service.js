import api from './api';

export const venueService = {
  getAllVenues: () => api.get('/venues'),
  createVenue: (data) => api.post('/venues', data),
  updateVenue: (id, data) => api.put(`/venues/${id}`, data),
  deleteVenue: (id) => api.delete(`/venues/${id}`),
};
