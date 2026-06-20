import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  verifyEmail:          (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification:   (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword:       (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:        (data)  => api.post('/auth/reset-password', data),
  changePassword:       (data)  => api.put('/auth/change-password', data),
  refreshToken:         (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  getMe:                ()      => api.get('/auth/me'),
  createSpeaker:        (data)  => api.post('/auth/speakers', data),
};
