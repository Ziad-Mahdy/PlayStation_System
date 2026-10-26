import { create } from 'zustand';
import { translations } from '../i18n/translations';

const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem('playstation_language');
    if (saved === 'en' || saved === 'ar') return saved;
  } catch (e) {}
  return 'ar'; // default
};

const applyDocumentLanguage = (lang) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
};

// Initial document configuration
const initialLang = getSavedLanguage();
applyDocumentLanguage(initialLang);

const useLanguageStore = create((set, get) => ({
  language: initialLang,

  // Helper function to get translation
  t: (key, ...args) => {
    const lang = get().language;
    const val = translations[lang]?.[key] || translations['ar']?.[key] || key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return val;
  },

  setLanguage: (newLang) => {
    if (newLang !== 'ar' && newLang !== 'en') return;
    try {
      localStorage.setItem('playstation_language', newLang);
    } catch (e) {}
    applyDocumentLanguage(newLang);
    set({ language: newLang });
  },

  toggleLanguage: () => {
    const next = get().language === 'ar' ? 'en' : 'ar';
    get().setLanguage(next);
  },
}));

export default useLanguageStore;
