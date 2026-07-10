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
          const data = res.data.data || res.data;
          
          if (data.mustChangePassword) {
            set({ isLoading: false });
            return { success: true, mustChangePassword: true, user: data.user };
          }

          const { accessToken, refreshToken, user } = data;
          
          //Chuẩn hóa tên biến user ngay từ lúc login để đồng bộ với toàn hệ thống
          const normalizedUser = {
            ...user,
            userId: user.UserID || user.userId,
            fullName: user.FullName || user.fullName,
            email: user.Email || user.email,
            role: user.Role || user.role,
            avatarURL: user.AvatarURL || user.avatarURL,
            phone: user.Phone || user.phone,
            // ĐÃ SỬA: Nhớ hứng trường University lúc login
            university: user.University || user.university, 
          };

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user: normalizedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, user: normalizedUser };
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
          
          //Chuẩn hóa tên biến user lúc lấy lại thông tin
          const normalizedUser = {
            userId: u.userId || u.UserID, 
            fullName: u.fullName || u.FullName, 
            email: u.email || u.Email,
            role: u.role || u.Role, 
            avatarURL: u.avatarURL || u.AvatarURL, 
            phone: u.phone || u.Phone,
            //lấy trường University để trang Sự kiện check
            university: u.university || u.University, 
            isVerified: u.isVerified, 
            createdAt: u.createdAt,
            organizerProfile: u.organizerProfile,
            speakerProfile: u.speakerProfile,
            orgApprovalStatus: u.organizerProfile?.approvalStatus || null,
            // Giữ lại các key viết hoa cũ cho các file component khác (như AdminDashboard) đỡ bị lỗi
            UserID: u.userId || u.UserID,
            FullName: u.fullName || u.FullName,
            Role: u.role || u.Role,
            Email: u.email || u.Email,
            AvatarURL: u.avatarURL || u.AvatarURL,
            University: u.university || u.University
          };
          
          set({ user: normalizedUser, isAuthenticated: true });
          return normalizedUser;
        } catch { 
          get().logout(); 
        }
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