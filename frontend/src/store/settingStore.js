import { create } from 'zustand';

const useSettingStore = create((set) => ({
  theme: localStorage.getItem('ems_theme') || 'light',
  language: localStorage.getItem('ems_language') || 'vi',
  emailNotifs: localStorage.getItem('ems_emailNotifs') === 'false' ? false : true,

  setTheme: (theme) => {
    localStorage.setItem('ems_theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark-mode-active');
    } else {
      document.body.classList.remove('dark-mode-active');
    }
    set({ theme });
  },

  setLanguage: (language) => {
    localStorage.setItem('ems_language', language);
    set({ language });
  },

  setEmailNotifs: (enabled) => {
    localStorage.setItem('ems_emailNotifs', enabled);
    // Ideally this would also trigger an API call to update the backend
    set({ emailNotifs: enabled });
  }
}));

// Khởi tạo ban đầu
if (localStorage.getItem('ems_theme') === 'dark') {
  document.body.classList.add('dark-mode-active');
}

export default useSettingStore;
