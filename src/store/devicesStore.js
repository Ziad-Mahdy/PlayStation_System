import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClientSession = () => {
  try {
    const raw = localStorage.getItem('playstation_client_session');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return useSubscriptionStore.getState().currentClient;
};

const getClientIdentifier = () => {
  const client = getClientSession();
  return client?.code || client?.phone || null;
};

const getCachedDevices = () => {
  const id = getClientIdentifier();
  if (!id) return [];
  try {
    const raw = localStorage.getItem(`ps_devices_cache_${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveDevicesCache = (devices) => {
  const id = getClientIdentifier();
  if (id && devices) {
    try {
      localStorage.setItem(`ps_devices_cache_${id}`, JSON.stringify(devices));
    } catch (e) {}
  }
};

const DEFAULT_CATEGORIES = ['PS4', 'PS5', 'VIP'];

const getCachedCategories = () => {
  const id = getClientIdentifier();
  if (!id) return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(`ps_categories_cache_${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return DEFAULT_CATEGORIES;
};

const saveCategoriesCache = (categories) => {
  const id = getClientIdentifier();
  if (id && categories) {
    try {
      localStorage.setItem(`ps_categories_cache_${id}`, JSON.stringify(categories));
    } catch (e) {}
  }
};

const isCategoriesInitialized = (id) => {
  if (!id) return false;
  return localStorage.getItem(`ps_cat_init_${id}`) === 'true';
};

const markCategoriesInitialized = (id) => {
  if (!id) return;
  try {
    localStorage.setItem(`ps_cat_init_${id}`, 'true');
  } catch (e) {}
};

const useDevicesStore = create((set, get) => ({
  categories: getCachedCategories(),
  devices: getCachedDevices(), // استرجاع فوري من الكاش عند الـ Refresh لضمان عدم اختفاء الأجهزة أبداً
  completedSessions: [],
  nextSessionId: 1,
  nextOrderId: 1000,
  isLoading: false,
  isSynced: false,

  // ── جلب داتا الكلاينت فقط من Supabase مع دمج الكاش وحماية الجلسات النشطة ──
  initSync: async () => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    if (!identifier) {
      return;
    }

    try {
      const [dbDevices, dbCategories, dbSessions] = await Promise.all([
        supabaseService.fetchDevices(identifier, client?.phone),
        supabaseService.fetchCategories(identifier, client?.phone),
        supabaseService.fetchCompletedSessions(identifier, client?.phone),
      ]);

      const maxSessionId = (dbSessions || []).reduce((max, s) => Math.max(max, s.id || 0), 0);

      const isInitialized = isCategoriesInitialized(identifier);
      let finalCategories = [];

      if (dbCategories && dbCategories.length > 0) {
        finalCategories = dbCategories;
        markCategoriesInitialized(identifier);
      } else if (isInitialized) {
        finalCategories = getCachedCategories();
      } else {
        // أول دخول للكلاينت: نضع الفئات الافتراضية [PS4, PS5, VIP] ونحفظها في السيرفر والكاش
        finalCategories = DEFAULT_CATEGORIES;
        markCategoriesInitialized(identifier);
        if (identifier) {
          for (const cat of DEFAULT_CATEGORIES) {
            supabaseService.addCategory(cat, identifier, client?.phone);
          }
        }
      }
      saveCategoriesCache(finalCategories);

      const cached = getCachedDevices();
      const currentDevices = (get().devices && get().devices.length > 0) ? get().devices : cached;

      let mergedDevices = [];
      if (dbDevices && dbDevices.length > 0) {
        // ندمج بيانات السيرفر مع الجلسات الشغالة حالياً في الكاش لضمان عدم توقف أو تصفير العداد
        mergedDevices = dbDevices.map((dbDev) => {
          const localMatch = currentDevices.find((ld) => ld.id === dbDev.id || ld.name === dbDev.name);
          if (localMatch && localMatch.status === 'busy' && localMatch.session?.startTime) {
            // إذا كان الجهاز يعمل محلياً، نحافظ على توقيت البدء ونحدث السيرفر
            if (!dbDev.session || dbDev.status !== 'busy') {
              supabaseService.updateDevice(dbDev.id, {
                status: 'busy',
                session: localMatch.session,
              });
              return { ...dbDev, status: 'busy', session: localMatch.session };
            }
          }
          return dbDev;
        });
      } else if (currentDevices && currentDevices.length > 0) {
        // لو السيرفر لسه ملوش أجهزة ولكن الكاش المحلي به أجهزة: نحافظ عليها ونرفعها للسيرفر فوراً
        mergedDevices = currentDevices;
        for (const dev of currentDevices) {
          supabaseService.insertDevice(dev, identifier, client?.phone).then((created) => {
            if (created && created.id) {
              set((state) => ({
                devices: state.devices.map((d) => (d.name === dev.name ? { ...d, id: created.id } : d)),
              }));
              saveDevicesCache(get().devices);
            }
          });
        }
      } else {
        mergedDevices = [];
      }

      saveDevicesCache(mergedDevices);
      set({
        devices: mergedDevices,
        categories: finalCategories,
        completedSessions: dbSessions || [],
        nextSessionId: maxSessionId + 1,
        isLoading: false,
        isSynced: true,
      });
    } catch (err) {
      console.error('Failed to sync devices store with Supabase:', err);
      set({ isLoading: false });
    }
  },

  // ── إدارة فئات الصالة ──
  addCategory: async (catName) => {
    const trimmed = catName.trim();
    if (!trimmed) return false;
    if (get().categories.includes(trimmed)) return false;

    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    markCategoriesInitialized(identifier);
    const newCategories = [...get().categories, trimmed];
    set({ categories: newCategories });
    saveCategoriesCache(newCategories);
    if (identifier) {
      await supabaseService.addCategory(trimmed, identifier, client?.phone);
    }
    return true;
  },

  deleteCategory: async (catName) => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    markCategoriesInitialized(identifier);
    const newCategories = get().categories.filter((c) => c !== catName);
    set({ categories: newCategories });
    saveCategoriesCache(newCategories);
    if (identifier) {
      await supabaseService.deleteCategory(catName, identifier, client?.phone);
    }
  },

  // ── إضافة جهاز جديد للكلاينت ──
  addDevice: async (deviceData) => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    const nameTrimmed = (deviceData.name || '').trim();
    const exists = get().devices.some(
      (d) => d.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) return false;

    const tempId = Date.now();
    const newDevice = {
      id: tempId,
      name: nameTrimmed || `جهاز جديد`,
      type: deviceData.type || 'PlayStation 5',
      isVIP: Boolean(deviceData.isVIP),
      singlePrice: parseFloat(deviceData.singlePrice) || 45,
      multiPrice: parseFloat(deviceData.multiPrice) || 35,
      status: 'free',
      session: null,
    };

    const updatedDevices = [...get().devices, newDevice];
    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);

    if (identifier) {
      const created = await supabaseService.insertDevice(newDevice, identifier, client?.phone);
      if (created && created.id) {
        const withRealId = get().devices.map((d) => (d.id === tempId ? { ...d, id: created.id } : d));
        set({ devices: withRealId });
        saveDevicesCache(withRealId);
      }
    }

    return true;
  },

  // ── حذف جهاز ──
  deleteDevice: (deviceId) => {
    const updatedDevices = get().devices.filter((d) => d.id !== deviceId);
    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);
    supabaseService.deleteDevice(deviceId);
  },

  // ── بدء جلسة جديدة على جهاز (عداد حي مستمر عبر الخروج والتحديث) ──
  startSession: (deviceId, mode, timeType = 'open', targetMinutes = 60, customerName = '') => {
    let updatedSession = null;
    const updatedDevices = get().devices.map((d) => {
      if (d.id === deviceId) {
        updatedSession = {
          startTime: Date.now(),
          mode,
          timeType,
          targetMinutes: timeType === 'fixed' ? Math.max(1, Number(targetMinutes)) : null,
          customerName: (customerName || '').trim(),
          orders: [],
        };
        return {
          ...d,
          status: 'busy',
          session: updatedSession,
        };
      }
      return d;
    });

    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, {
        status: 'busy',
        session: updatedSession,
      });
    }
  },

  // ── تمديد وقت جلسة محددة ──
  extendSessionTime: (deviceId, extraMinutes) => {
    let updatedSession = null;
    const updatedDevices = get().devices.map((d) => {
      if (d.id !== deviceId || !d.session) return d;
      const currentTarget = d.session.targetMinutes || 0;
      updatedSession = {
        ...d.session,
        timeType: 'fixed',
        targetMinutes: currentTarget + Number(extraMinutes),
      };
      return {
        ...d,
        session: updatedSession,
      };
    });

    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── إضافة طلب / مشروب لجهاز ──
  addOrder: (deviceId, product) => {
    let updatedSession = null;
    const nextId = get().nextOrderId;

    const updatedDevices = get().devices.map((d) => {
      if (d.id !== deviceId || !d.session) return d;
      const existing = d.session.orders.find((o) => o.name === product.name);
      updatedSession = {
        ...d.session,
        orders: existing
          ? d.session.orders.map((o) =>
              o.name === product.name ? { ...o, qty: o.qty + 1 } : o
            )
          : [
              ...d.session.orders,
              { id: nextId, name: product.name, price: product.price, qty: 1 },
            ],
      };
      return {
        ...d,
        session: updatedSession,
      };
    });

    set({
      nextOrderId: nextId + 1,
      devices: updatedDevices,
    });
    saveDevicesCache(updatedDevices);

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── حذف طلب من جهاز ──
  removeOrder: (deviceId, orderId) => {
    let updatedSession = null;
    const updatedDevices = get().devices.map((d) => {
      if (d.id !== deviceId || !d.session) return d;
      updatedSession = {
        ...d.session,
        orders: d.session.orders.filter((o) => o.id !== orderId),
      };
      return {
        ...d,
        session: updatedSession,
      };
    });

    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── إنهاء الحساب وقفل الفاتورة ──
  endSession: (deviceId) => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    const device = get().devices.find((d) => d.id === deviceId);
    if (!device?.session) return;

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - device.session.startTime) / 1000);
    const hourlyRate =
      device.session.mode === 'single' ? device.singlePrice : device.multiPrice;
    const timeCost = parseFloat(((durationSeconds / 3600) * hourlyRate).toFixed(2));
    const ordersCost = device.session.orders.reduce(
      (sum, o) => sum + o.price * o.qty,
      0
    );

    const completed = {
      deviceName: device.name,
      deviceType: device.type,
      isVIP: device.isVIP,
      customerName: device.session.customerName || '',
      startTime: device.session.startTime,
      endTime,
      durationSeconds,
      mode: device.session.mode,
      timeType: device.session.timeType || 'open',
      targetMinutes: device.session.targetMinutes,
      timeCost,
      ordersCost: parseFloat(ordersCost.toFixed(2)),
      total: parseFloat((timeCost + ordersCost).toFixed(2)),
    };

    const updatedDevices = get().devices.map((d) =>
      d.id === deviceId ? { ...d, status: 'free', session: null } : d
    );

    set((state) => ({
      devices: updatedDevices,
      completedSessions: [...state.completedSessions, { ...completed, id: state.nextSessionId }],
      nextSessionId: state.nextSessionId + 1,
    }));
    saveDevicesCache(updatedDevices);

    supabaseService.updateDevice(deviceId, { status: 'free', session: null });

    if (identifier) {
      supabaseService.addCompletedSession(completed, identifier, client?.phone).then((saved) => {
        if (saved?.id) {
          set((state) => ({
            completedSessions: state.completedSessions.map((s) =>
              s.startTime === completed.startTime ? { ...s, id: saved.id } : s
            ),
          }));
        }
      });
    }
  },

  // ── تعديل أسعار جهاز ──
  updateDevicePrice: (deviceId, priceType, value) => {
    const key = priceType === 'single' ? 'singlePrice' : 'multiPrice';
    const numVal = parseFloat(value) || 0;

    const updatedDevices = get().devices.map((d) =>
      d.id === deviceId ? { ...d, [key]: numVal } : d
    );
    set({ devices: updatedDevices });
    saveDevicesCache(updatedDevices);

    supabaseService.updateDevice(deviceId, { [key]: numVal });
  },

  // ── تفريغ فواتير اليوم ──
  clearCompletedSessions: () => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    set({ completedSessions: [], nextSessionId: 1 });
    if (identifier) {
      supabaseService.clearCompletedSessions(identifier);
    }
  },
}));

export default useDevicesStore;
