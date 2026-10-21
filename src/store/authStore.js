import { create } from 'zustand';

const ADMIN_PASSWORD = 'Admin@123';

const useAuthStore = create((set) => ({
  isAdmin: false,

  verifyAndEnterAdmin: (password) => {
    if (password === ADMIN_PASSWORD) {
      set({ isAdmin: true });
      return true;
    }
    return false;
  },

  exitAdmin: () => set({ isAdmin: false }),
}));

export default useAuthStore;
