import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null,
      isAuthenticated: false, isLoading: false, error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.login(credentials);
          const { accessToken, refreshToken, user } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, user };
        } catch (err) {
          const message = err.response?.data?.message || 'Đăng nhập thất bại';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.register(data);
          set({ isLoading: false });
          return { success: true, message: res.data.message };
        } catch (err) {
          const message = err.response?.data?.message || 'Đăng ký thất bại';
          set({ isLoading: false, error: message });
          return { success: false, message, errors: err.response?.data?.errors };
        }
      },

      logout: async () => {
        try { await authService.logout(); } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await authService.getMe();
          const u = res.data.data;
          // normalise field names from API
          const user = {
            userId: u.userId, fullName: u.fullName, email: u.email,
            role: u.role, avatarURL: u.avatarURL, phone: u.phone,
            isVerified: u.isVerified, createdAt: u.createdAt,
            organizerProfile: u.organizerProfile,
            speakerProfile: u.speakerProfile,
            orgApprovalStatus: u.organizerProfile?.approvalStatus || null,
          };
          // Map UserID for middleware compatibility
          user.UserID = user.userId;
          user.Role   = user.role;
          user.Email  = user.email;
          set({ user, isAuthenticated: true });
          return user;
        } catch { get().logout(); }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'ems-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
    }
  )
);

export default useAuthStore;
