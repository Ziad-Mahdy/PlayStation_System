import { create } from 'zustand';
import { subscriptionService } from '../services/subscriptionService';

// بيانات تسجيل دخول المطور السرية (يمكن تعيينها من .env أو تغييرها هنا)
const DEV_PHONE = (import.meta.env.VITE_DEV_PHONE || '135635').trim();
const DEV_CODE = (import.meta.env.VITE_DEV_CODE || import.meta.env.VITE_DEV_PASSWORD || 'Mahdy@111').trim();

// استعادة جلسة الكلاينت المخزنة في المتصفح إن وجدت
const getSavedClient = () => {
  try {
    const raw = localStorage.getItem('playstation_client_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const getSavedDev = () => {
  try {
    return sessionStorage.getItem('playstation_dev_session') === 'true';
  } catch (e) {
    return false;
  }
};

const useSubscriptionStore = create((set, get) => ({
  // ── Client State ──
  currentClient: getSavedClient(),
  isClientLoggedIn: Boolean(getSavedClient()),
  isClientLoading: false,

  // ── Developer State ──
  isDevLoggedIn: getSavedDev(),
  subscribers: [],
  isLoadingSubscribers: false,

  // ── Client Actions ──
  loginClient: async (phone, code) => {
    set({ isClientLoading: true });
    try {
      const result = await subscriptionService.loginAndVerifyClient(phone, code);
      if (result.success && result.client) {
        // إذا كان هذا كود جديد أو مختلف عن الجلسة السابقة: ننظف الذاكرة القديمة تماماً لضمان البدء من الصفر
        const prevSessionRaw = localStorage.getItem('playstation_client_session');
        let prevClient = null;
        try {
          prevClient = prevSessionRaw ? JSON.parse(prevSessionRaw) : null;
        } catch (e) {}

        if (result.isNewActivation || (prevClient && prevClient.code !== result.client.code)) {
          try {
            const keysToClean = [
              result.client.code,
              result.client.phone,
              prevClient?.code,
              prevClient?.phone,
            ].filter(Boolean);

            keysToClean.forEach((k) => {
              localStorage.removeItem(`ps_devices_cache_${k}`);
              localStorage.removeItem(`ps_categories_cache_${k}`);
              localStorage.removeItem(`ps_products_cache_${k}`);
              localStorage.removeItem(`ps_cat_init_${k}`);
            });
          } catch (e) {}
        }
        localStorage.setItem('playstation_client_session', JSON.stringify(result.client));
        set({
          currentClient: result.client,
          isClientLoggedIn: true,
          isClientLoading: false,
        });
        return { success: true, isNewActivation: result.isNewActivation };
      } else {
        set({ isClientLoading: false });
        return { success: false, message: result.message };
      }
    } catch (err) {
      set({ isClientLoading: false });
      return { success: false, message: 'حدث خطأ أثناء محاولة تسجيل الدخول' };
    }
  },

  logoutClient: () => {
    try {
      localStorage.removeItem('playstation_client_session');
    } catch (e) {}
    set({
      currentClient: null,
      isClientLoggedIn: false,
    });
  },

  // فحص وتحديث حالة الاشتراك الحالية من السيرفر
  checkAndUpdateCurrentClient: async () => {
    const client = get().currentClient;
    if (!client || !client.phone) return;

    try {
      const fresh = await subscriptionService.fetchClientStatus(client.phone);
      if (!fresh || fresh.is_suspended) {
        get().logoutClient();
        return;
      }

      if (fresh.expires_at && new Date() > new Date(fresh.expires_at)) {
        get().logoutClient();
        return;
      }

      // تحديث البيانات في الـ state والـ localStorage
      localStorage.setItem('playstation_client_session', JSON.stringify(fresh));
      set({ currentClient: fresh });
    } catch (err) {
      console.error('Error refreshing client status:', err);
    }
  },

  // ── Developer Actions ──
  loginDev: (phone, code) => {
    const cleanPhone = (phone || '').trim();
    const cleanCode = (code || '').trim();

    const phoneMatches = cleanPhone === DEV_PHONE;
    const codeMatches =
      cleanCode === DEV_CODE ||
      cleanCode.toUpperCase() === DEV_CODE.toUpperCase();

    if (phoneMatches && codeMatches) {
      sessionStorage.setItem('playstation_dev_session', 'true');
      set({ isDevLoggedIn: true });
      return true;
    }
    return false;
  },

  logoutDev: () => {
    sessionStorage.removeItem('playstation_dev_session');
    set({ isDevLoggedIn: false });
  },

  fetchSubscribers: async () => {
    set({ isLoadingSubscribers: true });
    const list = await subscriptionService.fetchAllSubscribers();
    set({ subscribers: list, isLoadingSubscribers: false });
  },

  addSubscriber: async (formData) => {
    try {
      const newSub = await subscriptionService.createSubscriber(formData);
      if (newSub) {
        set((state) => ({ subscribers: [newSub, ...state.subscribers] }));
        return { success: true, subscriber: newSub };
      }
      return { success: false, message: 'فشل إنشاء المشترك' };
    } catch (err) {
      return { success: false, message: err?.message || 'رقم الهاتف أو الكود مستخدم بالفعل' };
    }
  },

  extendSubscriber: async (id, days) => {
    try {
      const updated = await subscriptionService.extendSubscriber(id, days);
      if (updated) {
        set((state) => ({
          subscribers: state.subscribers.map((s) => (s.id === id ? updated : s)),
        }));
        // لو كان هذا هو نفس العميل الحالي المسجل، نحدث بياناته أيضاً
        if (get().currentClient?.id === id) {
          localStorage.setItem('playstation_client_session', JSON.stringify(updated));
          set({ currentClient: updated });
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  toggleSuspend: async (id, currentStatus) => {
    try {
      const updated = await subscriptionService.toggleSuspend(id, currentStatus);
      if (updated) {
        set((state) => ({
          subscribers: state.subscribers.map((s) => (s.id === id ? updated : s)),
        }));
        if (get().currentClient?.id === id && updated.is_suspended) {
          get().logoutClient();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  resetDeviceBinding: async (id) => {
    try {
      const ok = await subscriptionService.resetDeviceBinding(id);
      if (ok) {
        set((state) => ({
          subscribers: state.subscribers.map((s) =>
            s.id === id ? { ...s, device_serial: null } : s
          ),
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  updateAdminPassword: async (id, newPassword) => {
    try {
      const updated = await subscriptionService.updateAdminPassword(id, newPassword);
      if (updated) {
        set((state) => ({
          subscribers: state.subscribers.map((s) => (s.id === id ? updated : s)),
        }));
        if (get().currentClient?.id === id) {
          localStorage.setItem('playstation_client_session', JSON.stringify(updated));
          set({ currentClient: updated });
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  deleteSubscriber: async (id, phone = null, code = null) => {
    const sub = get().subscribers.find((s) => s.id === id);
    const targetPhone = phone || sub?.phone;
    const targetCode = code || sub?.code;

    const success = await subscriptionService.deleteSubscriber(id, targetPhone, targetCode);
    if (success) {
      if (
        get().currentClient?.id === id ||
        (targetPhone && get().currentClient?.phone === targetPhone) ||
        (targetCode && get().currentClient?.code === targetCode)
      ) {
        get().logoutClient();
      }
      set((state) => ({
        subscribers: state.subscribers.filter((s) => s.id !== id),
      }));
      return true;
    }
    return false;
  },
}));

export default useSubscriptionStore;
