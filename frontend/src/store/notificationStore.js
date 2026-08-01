import { create } from 'zustand';
import { registrationService } from '../services/registration.service';

const useNotificationStore = create((set, get) => ({
  notifications: [], unreadCount: 0,

  // [Lấy danh sách thông báo] UI gọi -> GET /api/registrations/notifications -> Cập nhật State
  fetchNotifications: async () => {
    try {
      const res = await registrationService.getNotifications();
      const list = res.data.data;
      set({ notifications: list, unreadCount: list.filter(n => !n.IsRead).length });
    } catch {}
  },

  // [Đánh dấu đã đọc 1 thông báo] UI gọi -> PATCH /api/registrations/notifications/:id/read -> Cập nhật State
  markRead: async (id) => {
    await registrationService.markRead(id);
    set((s) => ({
      notifications: s.notifications.map(n => n.NotificationID === id ? { ...n, IsRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  // [Đánh dấu đã đọc tất cả] UI gọi -> Cập nhật State local
  markAllRead: () => {
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, IsRead: true })), unreadCount: 0 }));
  },
}));

export default useNotificationStore;
