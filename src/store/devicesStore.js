import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';

// Clean up any old localStorage data from previous versions
try {
  localStorage.removeItem('ps-devices-store-v2');
  localStorage.removeItem('ps-devices-store');
} catch (e) {}

const useDevicesStore = create((set, get) => ({
  categories: [],
  devices: [],
  completedSessions: [],
  nextSessionId: 1,
  nextOrderId: 1000,
  isLoading: true,
  isSynced: false,

  // ── Initialize direct from Supabase ──
  initSync: async () => {
    try {
      const [dbDevices, dbCategories, dbSessions] = await Promise.all([
        supabaseService.fetchDevices(),
        supabaseService.fetchCategories(),
        supabaseService.fetchCompletedSessions(),
      ]);

      const maxSessionId = (dbSessions || []).reduce((max, s) => Math.max(max, s.id || 0), 0);

      set({
        devices: dbDevices || [],
        categories: dbCategories || [],
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

  // ── Category management (admin only) ──
  addCategory: async (catName) => {
    const trimmed = catName.trim();
    if (!trimmed) return false;
    if (get().categories.includes(trimmed)) return false;

    set((state) => ({ categories: [...state.categories, trimmed] }));
    await supabaseService.addCategory(trimmed);
    return true;
  },

  deleteCategory: async (catName) => {
    set((state) => ({
      categories: state.categories.filter((c) => c !== catName),
    }));
    await supabaseService.deleteCategory(catName);
  },

  // ── Start a new session on a free device ──
  startSession: (deviceId, mode, timeType = 'open', targetMinutes = 60, customerName = '') => {
    let updatedDevice = null;
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id === deviceId) {
          updatedDevice = {
            ...d,
            status: 'busy',
            session: {
              startTime: Date.now(),
              mode,
              timeType,
              targetMinutes: timeType === 'fixed' ? Math.max(1, Number(targetMinutes)) : null,
              customerName: (customerName || '').trim(),
              orders: [],
            },
          };
          return updatedDevice;
        }
        return d;
      }),
    }));
    if (updatedDevice) {
      supabaseService.upsertDevice(updatedDevice);
    }
  },

  // ── Extend time for an active fixed session ──
  extendSessionTime: (deviceId, extraMinutes) => {
    let updatedDevice = null;
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id !== deviceId || !d.session) return d;
        const currentTarget = d.session.targetMinutes || 0;
        updatedDevice = {
          ...d,
          session: {
            ...d.session,
            timeType: 'fixed',
            targetMinutes: currentTarget + Number(extraMinutes),
          },
        };
        return updatedDevice;
      }),
    }));
    if (updatedDevice) {
      supabaseService.upsertDevice(updatedDevice);
    }
  },

  // ── End session: compute totals and archive ──
  endSession: (deviceId) => {
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

    const freeDevice = { ...device, status: 'free', session: null };

    set((state) => ({
      devices: state.devices.map((d) => (d.id === deviceId ? freeDevice : d)),
      completedSessions: [...state.completedSessions, { ...completed, id: state.nextSessionId }],
      nextSessionId: state.nextSessionId + 1,
    }));

    supabaseService.upsertDevice(freeDevice);
    supabaseService.addCompletedSession(completed).then((saved) => {
      if (saved?.id) {
        set((state) => ({
          completedSessions: state.completedSessions.map((s) =>
            s.startTime === completed.startTime ? { ...s, id: saved.id } : s
          ),
        }));
      }
    });
  },

  // ── Add a product to an active session ──
  addOrder: (deviceId, product) => {
    let updatedDevice = null;
    set((state) => {
      const nextId = state.nextOrderId;
      return {
        nextOrderId: nextId + 1,
        devices: state.devices.map((d) => {
          if (d.id !== deviceId || !d.session) return d;
          const existing = d.session.orders.find((o) => o.name === product.name);
          updatedDevice = {
            ...d,
            session: {
              ...d.session,
              orders: existing
                ? d.session.orders.map((o) =>
                    o.name === product.name ? { ...o, qty: o.qty + 1 } : o
                  )
                : [
                    ...d.session.orders,
                    { id: nextId, name: product.name, price: product.price, qty: 1 },
                  ],
            },
          };
          return updatedDevice;
        }),
      };
    });
    if (updatedDevice) {
      supabaseService.upsertDevice(updatedDevice);
    }
  },

  // ── Remove an order item ──
  removeOrder: (deviceId, orderId) => {
    let updatedDevice = null;
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id !== deviceId || !d.session) return d;
        updatedDevice = {
          ...d,
          session: {
            ...d.session,
            orders: d.session.orders.filter((o) => o.id !== orderId),
          },
        };
        return updatedDevice;
      }),
    }));
    if (updatedDevice) {
      supabaseService.upsertDevice(updatedDevice);
    }
  },

  // ── Update single/multi price for a device (admin only) ──
  updateDevicePrice: (deviceId, priceType, value) => {
    const key = priceType === 'single' ? 'singlePrice' : 'multiPrice';
    let updatedDevice = null;
    set((state) => ({
      devices: state.devices.map((d) => {
        if (d.id === deviceId) {
          updatedDevice = { ...d, [key]: parseFloat(value) };
          return updatedDevice;
        }
        return d;
      }),
    }));
    if (updatedDevice) {
      supabaseService.upsertDevice(updatedDevice);
    }
  },

  // ── Add new device (admin only) ──
  addDevice: (deviceData) => {
    const nameTrimmed = (deviceData.name || '').trim();
    const exists = get().devices.some(
      (d) => d.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) return false;

    const maxId = get().devices.reduce((max, d) => Math.max(max, d.id), 0);
    const newId = maxId + 1;
    const newDevice = {
      id: newId,
      name: nameTrimmed || `جهاز ${newId}`,
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

    supabaseService.upsertDevice(newDevice).then((saved) => {
      if (saved?.id) {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.name === newDevice.name ? { ...d, id: saved.id } : d
          ),
        }));
      }
    });

    return true;
  },

  // ── Delete a device (admin only) ──
  deleteDevice: (deviceId) => {
    const target = get().devices.find((d) => d.id === deviceId);
    if (target) {
      supabaseService.deleteDevice(target.name);
    }
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
    }));
  },

  // ── Clear today's completed sessions (admin action) ──
  clearCompletedSessions: () => {
    set({ completedSessions: [], nextSessionId: 1 });
    supabaseService.clearCompletedSessions();
  },
}));

export default useDevicesStore;
