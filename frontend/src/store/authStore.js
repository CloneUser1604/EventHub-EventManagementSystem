import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';
import useSettingStore from './settingStore';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null,
      isAuthenticated: false, isLoading: false, error: null,

      // [Đăng nhập] UI (LoginPage) gọi -> POST /api/auth/login -> Lưu user + token vào State
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
            isFPTStudent: user.IsFPTStudent ?? user.isFPTStudent ?? false, 
            organizationName: user.organizationName || user.OrganizationName || '',
            avatarURL: user.avatarURL || user.AvatarURL || '',
            isActive: user.IsActive ?? user.isActive ?? true,
            isVerified: user.IsVerified ?? user.isVerified ?? false,
            MustChangePassword: user.MustChangePassword ?? false,
            IsFPTStudent: user.IsFPTStudent ?? user.isFPTStudent ?? false
          };

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user: normalizedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, user: normalizedUser };
        } catch (err) {
          const errorData = err.response?.data || {};
          const message = errorData.message || 'Đăng nhập thất bại';
          set({ isLoading: false, error: message });
          return { success: false, ...errorData, message };
        }
      },

      // [Đăng nhập Google] UI gọi -> POST /api/auth/google -> Cập nhật State
      googleLogin: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authService.googleLogin(idToken);
          const data = res.data.data || res.data;
          
          if (data.mustChangePassword) {
            set({ isLoading: false });
            return { success: true, mustChangePassword: true, user: data.user };
          }

          const { accessToken, refreshToken, user } = data;
          const normalizedUser = {
            ...user,
            userId: user.UserID || user.userId,
            fullName: user.FullName || user.fullName,
            email: user.Email || user.email,
            role: user.Role || user.role,
            avatarURL: user.AvatarURL || user.avatarURL,
            phone: user.Phone || user.phone || '',
            isFPTStudent: user.IsFPTStudent ?? user.isFPTStudent ?? false, 
            organizationName: user.organizationName || user.OrganizationName || '',
            avatarURL: user.avatarURL || user.AvatarURL || '',
            isActive: user.IsActive ?? user.isActive ?? true,
            isVerified: user.IsVerified ?? user.isVerified ?? false,
            IsFPTStudent: user.IsFPTStudent ?? user.isFPTStudent ?? false
          };

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user: normalizedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true, user: normalizedUser };
        } catch (err) {
          const errorData = err.response?.data || {};
          const message = errorData.message || 'Đăng nhập Google thất bại';
          set({ isLoading: false, error: message });
          return { success: false, ...errorData, message };
        }
      },

      // [Đăng ký tài khoản] UI (RegisterPage) gọi -> POST /api/auth/register -> Cập nhật State
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

      // [Đăng xuất] UI gọi -> POST /api/auth/logout -> Xóa State + localStorage
      logout: async () => {
        try { await authService.logout(); } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Đặt lại mặc định giao diện Sáng và Tiếng Việt khi đăng xuất
        useSettingStore.getState().setTheme('light');
        useSettingStore.getState().setLanguage('vi');

        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      // [Lấy thông tin cá nhân] UI gọi -> GET /api/auth/me -> Cập nhật State
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
            //lấy trường IsFPTStudent để trang Sự kiện check
            isFPTStudent: u.isFPTStudent ?? u.IsFPTStudent ?? false, 
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
            IsFPTStudent: u.isFPTStudent ?? u.IsFPTStudent ?? false
          };
          
          set({ user: normalizedUser, isAuthenticated: true });
          return normalizedUser;
        } catch { 
          get().logout(); 
        }
      },

      // [Xóa lỗi] UI gọi -> Reset trường error trong State
      clearError: () => set({ error: null }),
    }),
    {
      name: 'ems-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
    }
  )
);

export default useAuthStore;