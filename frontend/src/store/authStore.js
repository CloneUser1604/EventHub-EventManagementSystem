import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Login ───────────────────────────────────────────────
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.login(credentials);
          const { accessToken, refreshToken, user } = res.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Đăng nhập thất bại';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      // ── Register ────────────────────────────────────────────
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.register(data);
          set({ isLoading: false, error: null });
          return { success: true, message: res.data.message };
        } catch (err) {
          const message = err.response?.data?.message || 'Đăng ký thất bại';
          const errors = err.response?.data?.errors || null;
          set({ isLoading: false, error: message });
          return { success: false, message, errors };
        }
      },

      // ── Logout ──────────────────────────────────────────────
      logout: async () => {
        try {
          await authService.logout();
        } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      // ── Fetch current user ──────────────────────────────────
      fetchMe: async () => {
        try {
          const res = await authService.getMe();
          set({ user: res.data.data, isAuthenticated: true });
          return res.data.data;
        } catch {
          get().logout();
        }
      },

      // ── Clear error ─────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: 'ems-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
