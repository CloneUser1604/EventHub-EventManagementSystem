import api from './api';

export const staffService = {
  getEventParticipants: async (eventId) => {
    const res = await api.get(`/staff/events/${eventId}/participants`);
    return res.data;
  },
  
  inviteStaff: async (eventId, participantId) => {
    const res = await api.post(`/staff/events/${eventId}/invite`, { participantId });
    return res.data;
  },
  
  respondToInvitation: async (eventId, action) => {
    const res = await api.post(`/staff/events/${eventId}/respond`, { action });
    return res.data;
  },

  getMyInvitations: async () => {
    const res = await api.get('/staff/invitations');
    return res.data;
  },

  generateStaffSession: async (eventId) => {
    const res = await api.get(`/staff/session/${eventId}`);
    return res.data;
  },

  revokeStaff: async (eventId, staffId) => {
    const res = await api.delete(`/staff/events/${eventId}/staff/${staffId}`);
    return res.data;
  },

  participantCheckinWithOTP: async (eventId, otp, staffId) => {
    const res = await api.post(`/staff/events/${eventId}/participant-checkin`, { otp, staffId });
    return res.data;
  }
};
