import { create } from 'zustand';
import { registrationService } from '../services/registration.service';

const useNotificationStore = create((set, get) => ({
  notifications: [], unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await registrationService.getNotifications();
      const list = res.data.data;
      set({ notifications: list, unreadCount: list.filter(n => !n.IsRead).length });
    } catch {}
  },

  markRead: async (id) => {
    await registrationService.markRead(id);
    set((s) => ({
      notifications: s.notifications.map(n => n.NotificationID === id ? { ...n, IsRead: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, IsRead: true })), unreadCount: 0 }));
  },
}));

export default useNotificationStore;
