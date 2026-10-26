import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClientIdentifier = () => {
  const client = useSubscriptionStore.getState().currentClient;
  return client?.code || client?.phone || null;
};

const getCachedProducts = () => {
  const id = getClientIdentifier();
  if (!id) return [];
  try {
    const raw = localStorage.getItem(`ps_products_cache_${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveProductsCache = (products) => {
  const id = getClientIdentifier();
  if (id && products) {
    try {
      localStorage.setItem(`ps_products_cache_${id}`, JSON.stringify(products));
    } catch (e) {}
  }
};

const useAdminStore = create((set, get) => ({
  products: getCachedProducts(), // استرجاع فوري من الكاش عند الـ Refresh لمنع اختفاء المشروبات
  nextProductId: 1,
  isLoading: false,
  isSynced: false,

  // ── جلب منتجات الكلاينت فقط من Supabase ──
  initSync: async () => {
    const identifier = getClientIdentifier();
    if (!identifier) {
      set({ products: [], isLoading: false });
      return;
    }

    try {
      const dbProducts = await supabaseService.fetchProducts(identifier);
      if (dbProducts) {
        const maxId = dbProducts.reduce((max, p) => Math.max(max, p.id || 0), 0);
        saveProductsCache(dbProducts);
        set({
          products: dbProducts,
          nextProductId: maxId + 1,
          isLoading: false,
          isSynced: true,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Failed to sync admin store with Supabase:', err);
      set({ isLoading: false });
    }
  },

  // ── إضافة منتج جديد للبوفيه ──
  addProduct: async (product) => {
    const identifier = getClientIdentifier();
    const nameTrimmed = (product.name || '').trim();
    const exists = get().products.some(
      (p) => p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) return false;

    const tempId = Date.now();
    const newProd = { ...product, id: tempId, name: nameTrimmed };

    const updated = [...get().products, newProd];
    set({
      products: updated,
      nextProductId: get().nextProductId + 1,
    });
    saveProductsCache(updated);

    if (identifier) {
      const created = await supabaseService.insertProduct(newProd, identifier);
      if (created && created.id) {
        const withRealId = get().products.map((p) =>
          p.id === tempId ? { ...p, id: created.id } : p
        );
        set({ products: withRealId });
        saveProductsCache(withRealId);
      }
    }

    return true;
  },

  // ── تعديل منتج ──
  updateProduct: async (id, updates) => {
    if (updates.name) {
      const nameTrimmed = updates.name.trim();
      const exists = get().products.some(
        (p) => p.id !== id && p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
      );
      if (exists) return false;
      updates.name = nameTrimmed;
    }

    const updated = get().products.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ products: updated });
    saveProductsCache(updated);

    await supabaseService.updateProduct(id, updates);
    return true;
  },

  // ── حذف منتج ──
  deleteProduct: async (id) => {
    const updated = get().products.filter((p) => p.id !== id);
    set({ products: updated });
    saveProductsCache(updated);

    await supabaseService.deleteProduct(id);
  },
}));

export default useAdminStore;
