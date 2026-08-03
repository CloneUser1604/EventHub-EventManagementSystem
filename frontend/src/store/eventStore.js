import { create } from 'zustand';
import { eventService } from '../services/event.service';

const useEventStore = create((set, get) => ({
  events: [], total: 0, totalPages: 0, currentPage: 1,
  categories: [], venues: [],
  selectedEvent: null,
  isLoading: false, error: null,
  showFavs: false,
  setShowFavs: (val) => set((state) => ({ showFavs: typeof val === 'function' ? val(state.showFavs) : val })),
  filters: { 
    search: '', categoryId: '', venueId: '', timeStatus: 'upcoming', 
    isInternal: '', isOpenRegistration: false, startDate: '', endDate: '', 
    page: 1, limit: 6, sortBy: 'StartDate', sortOrder: 'ASC', status: 'all_published_cancelled' 
  },

  setFilters: (f) => set((s) => {
    const newFilters = typeof f === 'function' ? f(s.filters) : { ...s.filters, ...f };
    return { filters: newFilters };
  }),
  clearFilters: () => set((s) => ({ 
    filters: { 
      ...s.filters,
      search: '', categoryId: '', venueId: '', timeStatus: '', 
      isInternal: '', isOpenRegistration: false, startDate: '', endDate: '', page: 1 
    } 
  })),

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

  fetchMeta: async () => {
    const [cats, vens] = await Promise.all([eventService.getCategories(), eventService.getVenues()]);
    set({ categories: cats.data.data, venues: vens.data.data });
  },
}));

export default useEventStore;
