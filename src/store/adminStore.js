import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClientPhone = () => {
  return useSubscriptionStore.getState().currentClient?.phone;
};

const useAdminStore = create((set, get) => ({
  products: [],
  nextProductId: 1,
  isLoading: true,
  isSynced: false,

  // ── جلب منتجات الكلاينت فقط من Supabase ──
  initSync: async () => {
    const phone = getClientPhone();
    if (!phone) {
      set({ products: [], isLoading: false });
      return;
    }

    try {
      const dbProducts = await supabaseService.fetchProducts(phone);
      const maxId = (dbProducts || []).reduce((max, p) => Math.max(max, p.id || 0), 0);

      set({
        products: dbProducts || [], // يبدأ فارغاً تماماً للكلاينت الجديد
        nextProductId: maxId + 1,
        isLoading: false,
        isSynced: true,
      });
    } catch (err) {
      console.error('Failed to sync admin store with Supabase:', err);
      set({ isLoading: false });
    }
  },

  // ── إضافة منتج جديد للبوفيه ──
  addProduct: async (product) => {
    const phone = getClientPhone();
    const nameTrimmed = (product.name || '').trim();
    const exists = get().products.some(
      (p) => p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) return false;

    const tempId = Date.now();
    const newProd = { ...product, id: tempId, name: nameTrimmed };

    set((state) => ({
      products: [...state.products, newProd],
      nextProductId: state.nextProductId + 1,
    }));

    if (phone) {
      const created = await supabaseService.insertProduct(newProd, phone);
      if (created && created.id) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === tempId ? { ...p, id: created.id } : p
          ),
        }));
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

    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));

    await supabaseService.updateProduct(id, updates);
    return true;
  },

  // ── حذف منتج ──
  deleteProduct: async (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));

    await supabaseService.deleteProduct(id);
  },
}));

export default useAdminStore;
