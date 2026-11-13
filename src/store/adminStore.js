import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClient = () => {
  try {
    const raw = localStorage.getItem('playstation_client_session');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return useSubscriptionStore.getState().currentClient;
};

const useAdminStore = create((set, get) => ({
  products: [],
  nextProductId: 1,
  isLoading: false,
  isSynced: false,
  isSavingProduct: false,

  // ── تفريغ المخزن تماماً (عند تغيير الكود أو تسجيل الخروج) ──
  resetStore: () => {
    set({
      products: [],
      nextProductId: 1,
      isLoading: false,
      isSynced: false,
      isSavingProduct: false,
    });
  },

  // ── جلب المنتجات مباشرة من قاعدة البيانات Supabase ──
  initSync: async () => {
    const client = getClient();
    const clientCode = client?.code;
    if (!clientCode) {
      set({ products: [], isLoading: false, isSynced: true });
      return;
    }

    set({ isLoading: true });
    try {
      const dbProducts = await supabaseService.fetchProducts(clientCode);
      const maxId = (dbProducts || []).reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);

      set({
        products: dbProducts || [],
        nextProductId: maxId + 1,
        isLoading: false,
        isSynced: true,
      });
    } catch (err) {
      console.error('Failed to sync admin store with Supabase:', err);
      set({ isLoading: false });
    }
  },

  // ── إضافة منتج جديد للبوفيه مباشرة في قاعدة البيانات ──
  addProduct: async (product) => {
    if (get().isSavingProduct) return false;
    set({ isSavingProduct: true });

    try {
      const client = getClient();
      const clientCode = client?.code;
      const nameTrimmed = (product.name || '').trim();
      const normName = nameTrimmed.toLowerCase();

      // فحص عدم التكرار بالاسم في الحالة الحالية
      const exists = get().products.some(
        (p) => p.name.trim().toLowerCase() === normName
      );
      if (exists) return false;

      const payload = {
        name: nameTrimmed,
        price: parseFloat(product.price) || 0,
        category: product.category || 'مشروبات',
      };

      if (clientCode) {
        const created = await supabaseService.insertProduct(payload, clientCode, client?.phone);
        if (created && created.id) {
          const updated = [
            ...get().products.filter((p) => p.name.trim().toLowerCase() !== normName),
            created,
          ];
          set({
            products: updated,
            nextProductId: Math.max(get().nextProductId, Number(created.id) + 1),
          });
          return true;
        }
      }

      // في حالة عدم الاتصال (Fallback محلي)
      const fallbackProd = { ...payload, id: Date.now() };
      set((state) => ({
        products: [...state.products, fallbackProd],
      }));
      return true;
    } finally {
      set({ isSavingProduct: false });
    }
  },

  // ── تعديل منتج في قاعدة البيانات ──
  updateProduct: async (id, updates) => {
    const client = getClient();
    const clientCode = client?.code;

    if (updates.name) {
      const nameTrimmed = updates.name.trim();
      const normName = nameTrimmed.toLowerCase();
      const exists = get().products.some(
        (p) => (p.id !== id && String(p.id) !== String(id)) && p.name.trim().toLowerCase() === normName
      );
      if (exists) return false;
      updates.name = nameTrimmed;
    }

    const updated = get().products.map((p) =>
      p.id === id || String(p.id) === String(id) ? { ...p, ...updates } : p
    );
    set({ products: updated });

    if (typeof id === 'number' || !isNaN(Number(id))) {
      await supabaseService.updateProduct(Number(id), updates, clientCode);
    }
    return true;
  },

  // ── حذف منتج نهائياً من قاعدة البيانات والحالة ──
  deleteProduct: async (id, name = null) => {
    const client = getClient();
    const clientCode = client?.code;

    // 1. تحديد السجل المستهدف
    const target = get().products.find(
      (p) =>
        p.id === id ||
        String(p.id) === String(id) ||
        (name && p.name.trim().toLowerCase() === name.trim().toLowerCase())
    );
    const targetId = target?.id || id;
    const targetName = target?.name || name;
    const normName = (targetName || '').trim().toLowerCase();

    // 2. حذفه من الـ state فوراً
    const updated = get().products.filter(
      (p) =>
        p.id !== targetId &&
        String(p.id) !== String(targetId) &&
        (!normName || p.name.trim().toLowerCase() !== normName)
    );
    set({ products: updated });

    // 3. حذفه نهائياً من قاعدة بيانات Supabase
    if (clientCode) {
      await supabaseService.deleteProduct(
        typeof targetId === 'number' ? targetId : null,
        targetName,
        clientCode
      );
    }
  },
}));

export default useAdminStore;
