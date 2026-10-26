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

const getClientIdentifier = () => {
  const client = getClientSession();
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
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    if (!identifier) {
      set({ products: [], isLoading: false });
      return;
    }

    try {
      const dbProducts = await supabaseService.fetchProducts(identifier, client?.phone);
      const cached = getCachedProducts();
      const currentProducts = (get().products && get().products.length > 0) ? get().products : cached;

      let finalProducts = [];
      if (dbProducts && dbProducts.length > 0) {
        finalProducts = dbProducts;
      } else if (currentProducts && currentProducts.length > 0) {
        // لو الكاش به منتجات والسيرفر لسه ملوش: نحافظ عليها ونرفعها للسيرفر
        finalProducts = currentProducts;
        for (const p of currentProducts) {
          supabaseService.insertProduct(p, identifier, client?.phone).then((created) => {
            if (created && created.id) {
              set((state) => ({
                products: state.products.map((item) => (item.name === p.name ? { ...item, id: created.id } : item)),
              }));
              saveProductsCache(get().products);
            }
          });
        }
      } else {
        finalProducts = [];
      }

      saveProductsCache(finalProducts);
      const maxId = finalProducts.reduce((max, p) => Math.max(max, p.id || 0), 0);
      set({
        products: finalProducts,
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
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
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
      const created = await supabaseService.insertProduct(newProd, identifier, client?.phone);
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
