import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Helper ──────────────────────────────────────
const now = Date.now();
const ago = (minutes) => now - minutes * 60 * 1000;

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

// Demo completed sessions for the admin panel report
const INITIAL_COMPLETED = [];

// Demo default categories
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

      // ── Category management (admin only) ──
      addCategory: (catName) => {
        const trimmed = catName.trim();
        if (!trimmed) return false;
        if (get().categories.includes(trimmed)) return false;
        set((state) => ({ categories: [...state.categories, trimmed] }));
        return true;
      },

      deleteCategory: (catName) => {
        set((state) => ({
          categories: state.categories.filter((c) => c !== catName),
        }));
      },

      // ── Start a new session on a free device ──
      startSession: (deviceId, mode, timeType = 'open', targetMinutes = 60, customerName = '') => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? {
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
                }
              : d
          ),
        }));
      },

      // ── Extend time for an active fixed session ──
      extendSessionTime: (deviceId, extraMinutes) => {
        set((state) => ({
          devices: state.devices.map((d) => {
            if (d.id !== deviceId || !d.session) return d;
            const currentTarget = d.session.targetMinutes || 0;
            return {
              ...d,
              session: {
                ...d.session,
                timeType: 'fixed',
                targetMinutes: currentTarget + Number(extraMinutes),
              },
            };
          }),
        }));
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

        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId ? { ...d, status: 'free', session: null } : d
          ),
          completedSessions: [...state.completedSessions, completed],
          nextSessionId: state.nextSessionId + 1,
        }));
      },

      // ── Add a product to an active session ──
      addOrder: (deviceId, product) => {
        set((state) => {
          const nextId = state.nextOrderId;
          return {
            nextOrderId: nextId + 1,
            devices: state.devices.map((d) => {
              if (d.id !== deviceId || !d.session) return d;
              const existing = d.session.orders.find((o) => o.name === product.name);
              return {
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
            }),
          };
        });
      },

      // ── Remove an order item ──
      removeOrder: (deviceId, orderId) => {
        set((state) => ({
          devices: state.devices.map((d) => {
            if (d.id !== deviceId || !d.session) return d;
            return {
              ...d,
              session: {
                ...d.session,
                orders: d.session.orders.filter((o) => o.id !== orderId),
              },
            };
          }),
        }));
      },

      // ── Update single/multi price for a device (admin only) ──
      updateDevicePrice: (deviceId, priceType, value) => {
        const key = priceType === 'single' ? 'singlePrice' : 'multiPrice';
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId ? { ...d, [key]: parseFloat(value) } : d
          ),
        }));
      },

      // ── Add new device (admin only) ──
      addDevice: (deviceData) => {
        const nameTrimmed = (deviceData.name || '').trim();
        const exists = get().devices.some(
          (d) => d.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
        );
        if (exists) return false;

        set((state) => {
          const maxId = state.devices.reduce((max, d) => Math.max(max, d.id), 0);
          const newId = maxId + 1;
          const newDevice = {
            id: newId,
            name: nameTrimmed || `جهاز ${newId}`,
            type: deviceData.type || 'PS5',
            isVIP: Boolean(deviceData.isVIP),
            singlePrice: parseFloat(deviceData.singlePrice) || 45,
            multiPrice: parseFloat(deviceData.multiPrice) || 35,
            status: 'free',
            session: null,
          };
          return {
            devices: [...state.devices, newDevice],
          };
        });
        return true;
      },

      // ── Delete a device (admin only) ──
      deleteDevice: (deviceId) => {
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== deviceId),
        }));
      },

      // ── Clear today's completed sessions (admin action) ──
      clearCompletedSessions: () => set({ completedSessions: [], nextSessionId: 1 }),
    }),
    { name: 'ps-devices-store-v2' }
  )
);

export default useDevicesStore;
