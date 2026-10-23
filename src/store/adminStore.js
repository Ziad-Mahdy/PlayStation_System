import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseService } from '../services/supabaseService';

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'كانز بيبسي بارد', price: 15, category: 'مشروبات' },
  { id: 2, name: 'قهوة تركي مظبوط', price: 20, category: 'مشروبات' },
  { id: 3, name: 'شاي تلقيمة', price: 10, category: 'مشروبات' },
  { id: 4, name: 'مياه معدنية صغيرة', price: 7.5, category: 'مشروبات' },
];

const useAdminStore = create(
  persist(
    (set, get) => ({
      products: DEFAULT_PRODUCTS,
      nextProductId: DEFAULT_PRODUCTS.length + 1,
      isSynced: false,

      // ── Cloud sync initialization ──
      initSync: async () => {
        try {
          const dbProducts = await supabaseService.fetchProducts();
          if (dbProducts && dbProducts.length > 0) {
            const maxId = dbProducts.reduce((max, p) => Math.max(max, p.id || 0), 0);
            set({
              products: dbProducts,
              nextProductId: maxId + 1,
              isSynced: true,
            });
          }
        } catch (err) {
          console.error('Failed to sync admin store with Supabase:', err);
        }
      },

      addProduct: (product) => {
        const nameTrimmed = (product.name || '').trim();
        const exists = get().products.some(
          (p) => p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
        );
        if (exists) return false;

        const id = get().nextProductId;
        const newProd = { ...product, id, name: nameTrimmed };

        set((state) => ({
          products: [...state.products, newProd],
          nextProductId: id + 1,
        }));

        supabaseService.addProduct(newProd).then((created) => {
          if (created && created.id) {
            // Update local ID with Supabase generated ID if different
            set((state) => ({
              products: state.products.map((p) =>
                p.id === id ? { ...p, id: created.id } : p
              ),
            }));
          }
        });

        return true;
      },

      updateProduct: (id, updates) => {
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

        supabaseService.updateProduct(id, updates);
        return true;
      },

      deleteProduct: (id) => {
        const target = get().products.find((p) => p.id === id);
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));

        supabaseService.deleteProduct(id, target?.name);
      },
    }),
    { name: 'ps-admin-store-v2' }
  )
);

export default useAdminStore;
