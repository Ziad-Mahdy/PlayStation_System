import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Helper ──────────────────────────────────────
const now = Date.now();
const ago = (minutes) => now - minutes * 60 * 1000;

// ─── Initial Demo Data ────────────────────────────
const INITIAL_DEVICES = [
  {
    id: 1, name: 'جهاز 1', type: 'PS5', isVIP: true,
    singlePrice: 50, multiPrice: 40, status: 'busy',
    session: {
      startTime: ago(105),
      mode: 'single',
      orders: [
        { id: 101, name: 'كانز بيبسي بارد', price: 15, qty: 2 },
        { id: 102, name: 'قهوة تركي مظبوط', price: 20, qty: 1 },
        { id: 103, name: 'مياه معدنية صغيرة', price: 7.5, qty: 1 },
      ],
    },
  },
  { id: 2, name: 'جهاز 2', type: 'PS5', isVIP: false, singlePrice: 45, multiPrice: 35, status: 'free', session: null },
  {
    id: 3, name: 'جهاز 3', type: 'PS4', isVIP: false,
    singlePrice: 35, multiPrice: 25, status: 'busy',
    session: { startTime: ago(60), mode: 'single', orders: [] },
  },
  {
    id: 4, name: 'ترابيزة 4', type: 'PS5', isVIP: true,
    singlePrice: 60, multiPrice: 50, status: 'busy',
    session: {
      startTime: ago(195),
      mode: 'multi',
      orders: [
        { id: 201, name: 'كانز كولا', price: 15, qty: 4 },
        { id: 202, name: 'قهوة تركي', price: 20, qty: 2 },
      ],
    },
  },
  { id: 5, name: 'جهاز 5', type: 'PS4', isVIP: false, singlePrice: 35, multiPrice: 25, status: 'free', session: null },
  { id: 6, name: 'جهاز 6', type: 'PS5', isVIP: false, singlePrice: 45, multiPrice: 35, status: 'free', session: null },
  {
    id: 7, name: 'جهاز 7', type: 'PS4', isVIP: false,
    singlePrice: 35, multiPrice: 25, status: 'busy',
    session: { startTime: ago(30), mode: 'single', orders: [] },
  },
  { id: 8, name: 'جهاز 8', type: 'PS5', isVIP: false, singlePrice: 45, multiPrice: 35, status: 'free', session: null },
  { id: 9, name: 'جهاز 9', type: 'PS4', isVIP: false, singlePrice: 35, multiPrice: 25, status: 'free', session: null },
  {
    id: 10, name: 'جهاز 10', type: 'PS5', isVIP: true,
    singlePrice: 60, multiPrice: 50, status: 'busy',
    session: {
      startTime: ago(45),
      mode: 'multi',
      orders: [{ id: 301, name: 'شاي تلقيمة', price: 10, qty: 2 }],
    },
  },
  { id: 11, name: 'جهاز 11', type: 'PS4', isVIP: false, singlePrice: 35, multiPrice: 25, status: 'free', session: null },
  {
    id: 12, name: 'جهاز 12', type: 'PS5', isVIP: false,
    singlePrice: 45, multiPrice: 35, status: 'busy',
    session: {
      startTime: ago(90),
      mode: 'single',
      orders: [{ id: 401, name: 'مياه معدنية صغيرة', price: 7.5, qty: 1 }],
    },
  },
];

// Demo completed sessions for the admin panel report
const INITIAL_COMPLETED = [
  {
    id: 1, deviceName: 'جهاز 2', deviceType: 'PS5', isVIP: false,
    startTime: ago(240), endTime: ago(180), durationSeconds: 3600,
    mode: 'single', timeCost: 45, ordersCost: 30, total: 75,
  },
  {
    id: 2, deviceName: 'جهاز 5', deviceType: 'PS4', isVIP: false,
    startTime: ago(300), endTime: ago(240), durationSeconds: 3600,
    mode: 'multi', timeCost: 25, ordersCost: 15, total: 40,
  },
  {
    id: 3, deviceName: 'ترابيزة 4', deviceType: 'PS5', isVIP: true,
    startTime: ago(360), endTime: ago(300), durationSeconds: 3600,
    mode: 'multi', timeCost: 50, ordersCost: 85, total: 135,
  },
  {
    id: 4, deviceName: 'جهاز 9', deviceType: 'PS4', isVIP: false,
    startTime: ago(180), endTime: ago(120), durationSeconds: 3600,
    mode: 'single', timeCost: 35, ordersCost: 0, total: 35,
  },
];

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
    { name: 'ps-devices-store' }
  )
);

export default useDevicesStore;
