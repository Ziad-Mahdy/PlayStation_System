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
  isSavingProduct: false,

  // ── جلب منتجات الكلاينت فقط من Supabase مع توحيد وحذف أي تكرار ──
  initSync: async () => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;
    if (!identifier) {
      set({ products: [], isLoading: false });
      return;
    }

    try {
      const dbProducts = await supabaseService.fetchProducts(identifier, client?.phone);

      // توحيد المنتجات بالاسم لضمان عدم وجود أي تكرار نهائياً
      const seenNames = new Set();
      const finalProducts = [];
      for (const p of (dbProducts || [])) {
        const normName = (p.name || '').trim().toLowerCase();
        if (normName && !seenNames.has(normName)) {
          seenNames.add(normName);
          finalProducts.push(p);
        }
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

  // ── إضافة منتج جديد للبوفيه مع قفل متزامن لمنع الإضافة المزدوجة ──
  addProduct: async (product) => {
    if (get().isSavingProduct) return false;
    set({ isSavingProduct: true });

    try {
      const client = getClientSession();
      const identifier = client?.code || client?.phone;
      const nameTrimmed = (product.name || '').trim();
      const normName = nameTrimmed.toLowerCase();

      const exists = get().products.some(
        (p) => p.name.trim().toLowerCase() === normName
      );
      if (exists) return false;

      const payload = {
        name: nameTrimmed,
        price: parseFloat(product.price) || 0,
        category: product.category || 'مشروبات',
      };

      if (identifier) {
        const created = await supabaseService.insertProduct(payload, identifier, client?.phone);
        if (created && created.id) {
          const newProd = {
            id: created.id,
            name: created.name,
            price: parseFloat(created.price) || payload.price,
            category: created.category || payload.category,
          };
          const updated = [
            ...get().products.filter(
              (p) =>
                p.id !== created.id &&
                p.name.trim().toLowerCase() !== normName
            ),
            newProd,
          ];
          set({
            products: updated,
            nextProductId: Math.max(get().nextProductId, created.id + 1),
          });
          saveProductsCache(updated);
          return true;
        }
      }

      const tempId = Date.now();
      const fallbackProd = { ...payload, id: tempId };
      const updated = [
        ...get().products.filter(
          (p) => p.name.trim().toLowerCase() !== normName
        ),
        fallbackProd,
      ];
      set({
        products: updated,
        nextProductId: get().nextProductId + 1,
      });
      saveProductsCache(updated);
      return true;
    } finally {
      set({ isSavingProduct: false });
    }
  },

  // ── تعديل منتج ──
  updateProduct: async (id, updates) => {
    if (updates.name) {
      const nameTrimmed = updates.name.trim();
      const normName = nameTrimmed.toLowerCase();
      const exists = get().products.some(
        (p) => p.id !== id && p.name.trim().toLowerCase() === normName
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

  // ── حذف منتج نهائياً من الـ state وقاعدة البيانات والكاش ──
  deleteProduct: async (id, name = null) => {
    const client = getClientSession();
    const identifier = client?.code || client?.phone;

    // 1. تحديد المنتج المستهدف بدقة بالـ id أو الاسم
    const target = get().products.find(
      (p) =>
        p.id === id ||
        String(p.id) === String(id) ||
        (name && p.name.trim().toLowerCase() === name.trim().toLowerCase())
    );
    const targetId = target?.id || id;
    const targetName = target?.name || name;
    const normTargetName = (targetName || '').trim().toLowerCase();

    // 2. حذفه من الـ state والكاش المحلي فوراً لمنع عودته
    const updated = get().products.filter(
      (p) =>
        p.id !== targetId &&
        String(p.id) !== String(targetId) &&
        (!normTargetName || p.name.trim().toLowerCase() !== normTargetName)
    );
    set({ products: updated });
    saveProductsCache(updated);

    // 3. حذفه نهائياً من قاعدة بيانات Supabase
    if (identifier) {
      await supabaseService.deleteProduct(targetId, targetName, identifier, client?.phone);
    }
  },
}));

export default useAdminStore;
