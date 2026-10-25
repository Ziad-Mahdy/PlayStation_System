import { create } from 'zustand';
import useSubscriptionStore from './subscriptionStore';

const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

const useAuthStore = create((set) => ({
  isAdmin: false,

  verifyAndEnterAdmin: (password) => {
    const client = useSubscriptionStore.getState().currentClient;
    const requiredPassword = client?.admin_password || DEFAULT_ADMIN_PASSWORD;

    if (password === requiredPassword) {
      set({ isAdmin: true });
      return true;
    }
    return false;
  },

  exitAdmin: () => set({ isAdmin: false }),
}));

export default useAuthStore;
