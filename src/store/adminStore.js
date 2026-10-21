import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'كانز بيبسي بارد', price: 15, category: 'مشروبات' },
  { id: 2, name: 'قهوة تركي مظبوط', price: 20, category: 'مشروبات' },
  { id: 3, name: 'شاي تلقيمة', price: 10, category: 'مشروبات' },
  { id: 4, name: 'مياه معدنية صغيرة', price: 7.5, category: 'مشروبات' },
  { id: 5, name: 'إندومي مخصوص', price: 25, category: 'أكل' },
  { id: 6, name: 'كانز ريد بول', price: 25, category: 'مشروبات' },
  { id: 7, name: 'شيبسي', price: 10, category: 'سناكس' },
  { id: 8, name: 'نسكافيه', price: 15, category: 'مشروبات' },
  { id: 9, name: 'لاتيه', price: 25, category: 'مشروبات' },
  { id: 10, name: 'براوني', price: 20, category: 'حلويات' },
];

const useAdminStore = create(
  persist(
    (set, get) => ({
      products: DEFAULT_PRODUCTS,
      nextProductId: DEFAULT_PRODUCTS.length + 1,

      addProduct: (product) => {
        const nameTrimmed = (product.name || '').trim();
        const exists = get().products.some(
          (p) => p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
        );
        if (exists) return false;

        const id = get().nextProductId;
        set((state) => ({
          products: [...state.products, { ...product, id, name: nameTrimmed }],
          nextProductId: id + 1,
        }));
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
        return true;
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },
    }),
    { name: 'ps-admin-store' }
  )
);

export default useAdminStore;
