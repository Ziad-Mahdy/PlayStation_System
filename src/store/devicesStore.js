import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClientPhone = () => {
  return useSubscriptionStore.getState().currentClient?.phone;
};

const DEFAULT_CATEGORIES = ['PlayStation 5', 'PlayStation 4', 'بلياردو', 'بينج بونج', 'كمبيوتر PC'];

const useDevicesStore = create((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  devices: [],
  completedSessions: [],
  nextSessionId: 1,
  nextOrderId: 1000,
  isLoading: true,
  isSynced: false,

  // ── جلب داتا الكلاينت فقط من Supabase ──
  initSync: async () => {
    const phone = getClientPhone();
    if (!phone) {
      set({ devices: [], completedSessions: [], isLoading: false });
      return;
    }

    try {
      const [dbDevices, dbCategories, dbSessions] = await Promise.all([
        supabaseService.fetchDevices(phone),
        supabaseService.fetchCategories(phone),
        supabaseService.fetchCompletedSessions(phone),
      ]);

      const maxSessionId = (dbSessions || []).reduce((max, s) => Math.max(max, s.id || 0), 0);

      // الفئات: نأخذ فئات المشترك أو الفئات الافتراضية
      const finalCategories = dbCategories && dbCategories.length > 0 ? dbCategories : DEFAULT_CATEGORIES;

      set({
        devices: dbDevices || [], // يبدأ فارغاً تماماً للكلاينت الجديد كما طلب المستخدم
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

    const phone = getClientPhone();
    set((state) => ({ categories: [...state.categories, trimmed] }));
    if (phone) {
      await supabaseService.addCategory(trimmed, phone);
    }
    return true;
  },

  deleteCategory: async (catName) => {
    const phone = getClientPhone();
    set((state) => ({
      categories: state.categories.filter((c) => c !== catName),
    }));
    if (phone) {
      await supabaseService.deleteCategory(catName, phone);
    }
  },

  // ── إضافة جهاز جديد للكلاينت ──
  addDevice: async (deviceData) => {
    const phone = getClientPhone();
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

    set((state) => ({
      devices: [...state.devices, newDevice],
    }));

    if (phone) {
      const created = await supabaseService.insertDevice(newDevice, phone);
      if (created && created.id) {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === tempId ? { ...d, id: created.id } : d)),
        }));
      }
    }

    return true;
  },

  // ── حذف جهاز ──
  deleteDevice: (deviceId) => {
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
    }));
    supabaseService.deleteDevice(deviceId);
  },

  // ── بدء جلسة جديدة على جهاز ──
  startSession: (deviceId, mode, timeType = 'open', targetMinutes = 60, customerName = '') => {
    let updatedSession = null;
    set((state) => ({
      devices: state.devices.map((d) => {
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
      }),
    }));

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
    set((state) => ({
      devices: state.devices.map((d) => {
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
      }),
    }));

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── إضافة طلب / مشروب لجهاز ──
  addOrder: (deviceId, product) => {
    let updatedSession = null;
    set((state) => {
      const nextId = state.nextOrderId;
      return {
        nextOrderId: nextId + 1,
        devices: state.devices.map((d) => {
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
        }),
      };
    });

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── حذف طلب من جهاز ──
  removeOrder: (deviceId, orderId) => {
    let updatedSession = null;
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id !== deviceId || !d.session) return d;
        updatedSession = {
          ...d.session,
          orders: d.session.orders.filter((o) => o.id !== orderId),
        };
        return {
          ...d,
          session: updatedSession,
        };
      }),
    }));

    if (updatedSession) {
      supabaseService.updateDevice(deviceId, { session: updatedSession });
    }
  },

  // ── إنهاء الحساب وقفل الفاتورة ──
  endSession: (deviceId) => {
    const phone = getClientPhone();
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

    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, status: 'free', session: null } : d
      ),
      completedSessions: [...state.completedSessions, { ...completed, id: state.nextSessionId }],
      nextSessionId: state.nextSessionId + 1,
    }));

    // تحديث الجهاز في السيرفر السحابي ليصبح free
    supabaseService.updateDevice(deviceId, { status: 'free', session: null });

    // حفظ الفاتورة في السيرفر السحابي
    if (phone) {
      supabaseService.addCompletedSession(completed, phone).then((saved) => {
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

    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, [key]: numVal } : d
      ),
    }));

    supabaseService.updateDevice(deviceId, { [key]: numVal });
  },

  // ── تفريغ فواتير اليوم ──
  clearCompletedSessions: () => {
    const phone = getClientPhone();
    set({ completedSessions: [], nextSessionId: 1 });
    if (phone) {
      supabaseService.clearCompletedSessions(phone);
    }
  },
}));

export default useDevicesStore;
