import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService } from '../services/supabaseService';

// ─── Initial Demo Data ────────────────────────────
const INITIAL_DEVICES = [
  {
    id: 1,
    name: 'جهاز 1',
    type: 'PlayStation 5',
    isVIP: true,
    singlePrice: 50,
    multiPrice: 40,
    status: 'free',
    session: null,
  },
  {
    id: 2,
    name: 'جهاز 2',
    type: 'PlayStation 5',
    isVIP: false,
    singlePrice: 45,
    multiPrice: 35,
    status: 'free',
    session: null,
  },
  {
    id: 3,
    name: 'جهاز 3',
    type: 'PlayStation 4',
    isVIP: false,
    singlePrice: 35,
    multiPrice: 25,
    status: 'free',
    session: null,
  },
];

const INITIAL_COMPLETED = [];
const DEFAULT_CATEGORIES = ['PlayStation 5', 'PlayStation 4', 'بلياردو', 'بينج بونج', 'كمبيوتر PC'];

// ─── Store ────────────────────────────────────────
const useDevicesStore = create(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      devices: INITIAL_DEVICES,
      completedSessions: INITIAL_COMPLETED,
      nextSessionId: INITIAL_COMPLETED.length + 1,
      nextOrderId: 1000,
      isSynced: false,

      // ── Cloud sync initialization ──
      initSync: async () => {
        try {
          const [dbDevices, dbCategories, dbSessions] = await Promise.all([
            supabaseService.fetchDevices(),
            supabaseService.fetchCategories(),
            supabaseService.fetchCompletedSessions(),
          ]);

          const updates = {};
          if (dbDevices && dbDevices.length > 0) {
            updates.devices = dbDevices;
          }
          if (dbCategories && dbCategories.length > 0) {
            updates.categories = dbCategories;
          }
          if (dbSessions && dbSessions.length > 0) {
            updates.completedSessions = dbSessions;
            const maxSessionId = dbSessions.reduce((max, s) => Math.max(max, s.id || 0), 0);
            updates.nextSessionId = maxSessionId + 1;
          }
          updates.isSynced = true;
          set(updates);
        } catch (err) {
          console.error('Failed to sync devices store with Supabase:', err);
        }
      },

      // ── Category management (admin only) ──
      addCategory: (catName) => {
        const trimmed = catName.trim();
        if (!trimmed) return false;
        if (get().categories.includes(trimmed)) return false;
        set((state) => ({ categories: [...state.categories, trimmed] }));
        supabaseService.addCategory(trimmed);
        return true;
      },

      deleteCategory: (catName) => {
        set((state) => ({
          categories: state.categories.filter((c) => c !== catName),
        }));
        supabaseService.deleteCategory(catName);
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
                  timeType, // 'open' | 'fixed'
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
          id: get().nextSessionId,
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
          completedSessions: [...state.completedSessions, completed],
          nextSessionId: state.nextSessionId + 1,
        }));

        supabaseService.upsertDevice(freeDevice);
        supabaseService.addCompletedSession(completed);
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

        supabaseService.upsertDevice(newDevice);
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
    }),
    { name: 'ps-devices-store-v2' }
  )
);

export default useDevicesStore;
