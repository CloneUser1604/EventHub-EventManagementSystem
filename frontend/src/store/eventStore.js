import { create } from 'zustand';
import { eventService } from '../services/event.service';

const useEventStore = create((set, get) => ({
  events: [], total: 0, totalPages: 0, currentPage: 1,
  categories: [], venues: [],
  selectedEvent: null,
  isLoading: false, error: null,
  filters: { search: '', categoryId: '', status: '', startDate: '', endDate: '', page: 1, limit: 12 },

  // [Cập nhật bộ lọc sự kiện] UI gọi -> Cập nhật filters trong State
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f, page: 1 } })),
  // [Xóa bộ lọc] UI gọi -> Reset filters về mặc định
  clearFilters: () => set({ filters: { search:'', categoryId:'', status:'', startDate:'', endDate:'', page:1, limit:12 } }),

  // [Lấy danh sách sự kiện] UI gọi -> GET /api/events -> Cập nhật State
  fetchEvents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await eventService.getEvents(params || get().filters);
      const { events, pagination } = res.data.data;
      set({ events, total: pagination.total, totalPages: pagination.totalPages, currentPage: pagination.page, isLoading: false });
    } catch (e) {
      set({ error: e.response?.data?.message || 'Lỗi tải sự kiện', isLoading: false });
    }
  },

  // [Lấy chi tiết sự kiện] UI gọi -> GET /api/events/:id -> Cập nhật State
  fetchEventById: async (id) => {
    set({ isLoading: true, selectedEvent: null });
    try {
      const res = await eventService.getEventById(id);
      set({ selectedEvent: res.data.data, isLoading: false });
      return res.data.data;
    } catch (e) {
      set({ isLoading: false, error: e.response?.data?.message });
      return null;
    }
  },

  // [Lấy danh mục & địa điểm] UI gọi -> GET /api/events/categories + venues -> Cập nhật State
  fetchMeta: async () => {
    const [cats, vens] = await Promise.all([eventService.getCategories(), eventService.getVenues()]);
    set({ categories: cats.data.data, venues: vens.data.data });
  },
}));

export default useEventStore;
