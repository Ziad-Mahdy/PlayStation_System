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

const DEFAULT_CATEGORIES = ['PS4', 'PS5', 'VIP'];

const useDevicesStore = create((set, get) => ({
  categories: [],
  devices: [],
  completedSessions: [],
  nextSessionId: 1,
  nextOrderId: 1000,
  isLoading: false,
  isSynced: false,
  isSavingDevice: false,

  // ── تفريغ المخزن بالكامل (عند تسجيل الخروج أو تبديل الكود) ──
  resetStore: () => {
    set({
      categories: [],
      devices: [],
      completedSessions: [],
      nextSessionId: 1,
      nextOrderId: 1000,
      isLoading: false,
      isSynced: false,
      isSavingDevice: false,
    });
  },

  // ── جلب داتا الكلاينت مباشرة وحصرياً من Supabase بناءً على كود الاشتراك ──
  initSync: async () => {
    const client = getClientSession();
    const clientCode = client?.code;
    if (!clientCode) {
      set({
        devices: [],
        categories: [],
        completedSessions: [],
        isLoading: false,
        isSynced: true,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const [dbDevices, dbCategories, dbSessions] = await Promise.all([
        supabaseService.fetchDevices(clientCode),
        supabaseService.fetchCategories(clientCode),
        supabaseService.fetchCompletedSessions(clientCode),
      ]);

      let finalCategories = dbCategories || [];
      // إذا كان كود جديد تماماً بدون فئات، نقوم بتهيئة الفئات الافتراضية في قاعدة البيانات
      if (finalCategories.length === 0) {
        finalCategories = DEFAULT_CATEGORIES;
        for (const cat of DEFAULT_CATEGORIES) {
          await supabaseService.addCategory(cat, clientCode, client?.phone);
        }
      }

      const maxSessionId = (dbSessions || []).reduce(
        (max, s) => Math.max(max, Number(s.id) || 0),
        0
      );

      set({
        devices: dbDevices || [],
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
    const trimmed = (catName || '').trim();
    if (!trimmed) return false;
    if (get().categories.includes(trimmed)) return false;

    const client = getClientSession();
    const clientCode = client?.code;
    const newCategories = [...get().categories, trimmed];
    set({ categories: newCategories });

    if (clientCode) {
      await supabaseService.addCategory(trimmed, clientCode, client?.phone);
    }
    return true;
  },

  deleteCategory: async (catName) => {
    const client = getClientSession();
    const clientCode = client?.code;
    const newCategories = get().categories.filter((c) => c !== catName);
    set({ categories: newCategories });

    if (clientCode) {
      await supabaseService.deleteCategory(catName, clientCode);
    }
  },

  // ── إضافة جهاز جديد للكلاينت في Supabase ──
  addDevice: async (deviceData) => {
    if (get().isSavingDevice) return false;
    set({ isSavingDevice: true });

    try {
      const client = getClientSession();
      const clientCode = client?.code;
      const nameTrimmed = (deviceData.name || '').trim();
      const normName = nameTrimmed.toLowerCase();

      const exists = get().devices.some(
        (d) => d.name.trim().toLowerCase() === normName
      );
      if (exists) return false;

      const payload = {
        name: nameTrimmed || 'جهاز جديد',
        type: deviceData.type || 'PlayStation 5',
        isVIP: Boolean(deviceData.isVIP),
        singlePrice: parseFloat(deviceData.singlePrice) || 45,
        multiPrice: parseFloat(deviceData.multiPrice) || 35,
        status: 'free',
        session: null,
      };

      if (clientCode) {
        const created = await supabaseService.insertDevice(payload, clientCode, client?.phone);
        if (created && created.id) {
          const updatedDevices = [
            ...get().devices.filter((d) => d.name.trim().toLowerCase() !== normName),
            created,
          ];
          set({ devices: updatedDevices });
          return true;
        }
      }

      const fallbackDevice = { id: Date.now(), ...payload };
      set((state) => ({
        devices: [...state.devices, fallbackDevice],
      }));
      return true;
    } finally {
      set({ isSavingDevice: false });
    }
  },

  // ── حذف جهاز نهائياً من الـ state وقاعدة البيانات ──
  deleteDevice: async (deviceId) => {
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.filter(
      (d) => d.id !== deviceId && String(d.id) !== String(deviceId)
    );
    set({ devices: updatedDevices });

    if (clientCode) {
      await supabaseService.deleteDevice(deviceId, clientCode);
    }
  },

  // ── بدء جلسة جديدة على جهاز ──
  startSession: (deviceId, mode, timeType = 'open', targetMinutes = 60, customerName = '') => {
    let updatedSession = null;
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.map((d) => {
      if (d.id === deviceId || String(d.id) === String(deviceId)) {
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

    if (updatedSession && clientCode) {
      supabaseService.updateDevice(deviceId, {
        status: 'busy',
        session: updatedSession,
      }, clientCode);
    }
  },

  // ── تمديد وقت جلسة محددة ──
  extendSessionTime: (deviceId, extraMinutes) => {
    let updatedSession = null;
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.map((d) => {
      if ((d.id !== deviceId && String(d.id) !== String(deviceId)) || !d.session) return d;
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

    if (updatedSession && clientCode) {
      supabaseService.updateDevice(deviceId, { session: updatedSession }, clientCode);
    }
  },

  // ── إضافة طلب / مشروب لجهاز ──
  addOrder: (deviceId, product) => {
    let updatedSession = null;
    const nextId = get().nextOrderId;
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.map((d) => {
      if ((d.id !== deviceId && String(d.id) !== String(deviceId)) || !d.session) return d;
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

    if (updatedSession && clientCode) {
      supabaseService.updateDevice(deviceId, { session: updatedSession }, clientCode);
    }
  },

  // ── حذف طلب من جهاز ──
  removeOrder: (deviceId, orderId) => {
    let updatedSession = null;
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.map((d) => {
      if ((d.id !== deviceId && String(d.id) !== String(deviceId)) || !d.session) return d;
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

    if (updatedSession && clientCode) {
      supabaseService.updateDevice(deviceId, { session: updatedSession }, clientCode);
    }
  },

  // ── إنهاء الحساب وقفل الفاتورة ──
  endSession: async (deviceId) => {
    const client = getClientSession();
    const clientCode = client?.code;
    const device = get().devices.find(
      (d) => d.id === deviceId || String(d.id) === String(deviceId)
    );
    if (!device?.session) return null;

    const targetId = device.id;
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - Number(device.session.startTime)) / 1000);
    const hourlyRate =
      device.session.mode === 'single' ? device.singlePrice : device.multiPrice;
    const timeCost = parseFloat(((durationSeconds / 3600) * hourlyRate).toFixed(2));
    const ordersCost = (device.session.orders || []).reduce(
      (sum, o) => sum + (parseFloat(o.price) || 0) * (Number(o.qty) || 1),
      0
    );

    const completed = {
      deviceName: device.name,
      deviceType: device.type,
      isVIP: Boolean(device.isVIP),
      customerName: device.session.customerName || '',
      startTime: Number(device.session.startTime),
      endTime,
      durationSeconds,
      mode: device.session.mode,
      timeType: device.session.timeType || 'open',
      targetMinutes: device.session.targetMinutes || null,
      timeCost,
      ordersCost: parseFloat(ordersCost.toFixed(2)),
      total: parseFloat((timeCost + ordersCost).toFixed(2)),
    };

    // 1. تحديث الجهاز في الـ state وفي السيرفر ليكون متاحاً فوراً
    const updatedDevices = get().devices.map((d) =>
      d.id === targetId || String(d.id) === String(targetId)
        ? { ...d, status: 'free', session: null }
        : d
    );
    set({ devices: updatedDevices });

    if (clientCode) {
      await supabaseService.updateDevice(targetId, { status: 'free', session: null }, clientCode);
    }

    // 2. حفظ الفاتورة في السيرفر أولاً للحصول على الـ ID الحقيقي لمنع عودتها بعد الحذف
    let savedInvoice = null;
    if (clientCode) {
      try {
        const saved = await supabaseService.addCompletedSession(completed, clientCode, client?.phone);
        if (saved && saved.id) {
          savedInvoice = {
            ...completed,
            id: saved.id,
          };
        }
      } catch (err) {
        console.error('Error saving invoice to Supabase:', err);
      }
    }

    // Fallback محلي فقط إذا لم يكن متصلاً
    if (!savedInvoice) {
      savedInvoice = { ...completed, id: Date.now() };
    }

    // 3. وضع الفاتورة في الـ state بالـ ID الحقيقي الصادر من قاعدة البيانات
    set((state) => ({
      completedSessions: [savedInvoice, ...state.completedSessions.filter((s) => s.id !== savedInvoice.id)],
      nextSessionId: Math.max(state.nextSessionId, Number(savedInvoice.id) + 1),
    }));

    return savedInvoice;
  },

  // ── تعديل أسعار جهاز ──
  updateDevicePrice: (deviceId, priceType, value) => {
    const key = priceType === 'single' ? 'singlePrice' : 'multiPrice';
    const dbKey = priceType === 'single' ? 'single_price' : 'multi_price';
    const numVal = parseFloat(value) || 0;
    const client = getClientSession();
    const clientCode = client?.code;

    const updatedDevices = get().devices.map((d) =>
      d.id === deviceId || String(d.id) === String(deviceId) ? { ...d, [key]: numVal } : d
    );
    set({ devices: updatedDevices });

    if (clientCode) {
      supabaseService.updateDevice(deviceId, { [dbKey]: numVal }, clientCode);
    }
  },

  // ── حذف فاتورة فردية نهائياً من الـ state وقاعدة البيانات ──
  deleteCompletedSession: async (sessionId) => {
    const client = getClientSession();
    const clientCode = client?.code;

    // 1. مسحها محلياً من الـ state فوراً
    const updated = get().completedSessions.filter(
      (s) => s.id !== sessionId && String(s.id) !== String(sessionId)
    );
    set({ completedSessions: updated });

    // 2. مسحها نهائياً من Supabase بمعرف السجل وكود العميل
    if (clientCode) {
      await supabaseService.deleteCompletedSession(sessionId, clientCode);
    }
  },

  // ── مسح فواتير اليوم أو الجميع من قاعدة البيانات ──
  clearCompletedSessions: async (onlyToday = true) => {
    const client = getClientSession();
    const clientCode = client?.code;

    if (onlyToday) {
      const now = new Date();
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const remaining = get().completedSessions.filter(
        (s) => Number(s.endTime || s.startTime) < startOfTodayMs
      );
      set({ completedSessions: remaining });
      if (clientCode) {
        await supabaseService.clearCompletedSessions(clientCode, true);
      }
    } else {
      set({ completedSessions: [], nextSessionId: 1 });
      if (clientCode) {
        await supabaseService.clearCompletedSessions(clientCode, false);
      }
    }
  },
}));

export default useDevicesStore;
