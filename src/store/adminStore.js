import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';
import useSubscriptionStore from './subscriptionStore';

const getClientPhone = () => {
  return useSubscriptionStore.getState().currentClient?.phone || 'default';
};

const useAdminStore = create((set, get) => ({
  products: [],
  nextProductId: 1,
  isLoading: true,
  isSynced: false,

  // ── Load products directly from Supabase ──
  initSync: async () => {
    const phone = getClientPhone();
    try {
      const dbProducts = await supabaseService.fetchProducts(phone);
      const maxId = (dbProducts || []).reduce((max, p) => Math.max(max, p.id || 0), 0);
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

  addProduct: async (product) => {
    const phone = getClientPhone();
    const nameTrimmed = (product.name || '').trim();
    const exists = get().products.some(
      (p) => p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (exists) return false;

    const tempId = get().nextProductId;
    const newProd = { ...product, id: tempId, name: nameTrimmed };

    set((state) => ({
      products: [...state.products, newProd],
      nextProductId: tempId + 1,
    }));

    const created = await supabaseService.addProduct(newProd, phone);
    if (created && created.id) {
      set((state) => ({
        products: state.products.map((p) =>
          p.id === tempId ? { ...p, id: created.id } : p
        ),
      }));
    }

    return true;
  },

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

  deleteProduct: async (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));

    await supabaseService.deleteProduct(id);
  },
}));

export default useAdminStore;
