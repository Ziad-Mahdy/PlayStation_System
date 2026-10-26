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

const initialLang = getSavedLanguage();
applyDocumentLanguage(initialLang);

const makeTranslator = (lang) => (key, ...args) => {
  const dict = translations[lang] || translations['ar'];
  const val = dict?.[key] !== undefined ? dict[key] : (translations['ar']?.[key] || key);
  if (typeof val === 'function') {
    return val(...args);
  }
  return val;
};

const useLanguageStore = create((set, get) => ({
  language: initialLang,
  isEn: initialLang === 'en',
  isAr: initialLang === 'ar',
  t: makeTranslator(initialLang),

  setLanguage: (newLang) => {
    if (newLang !== 'ar' && newLang !== 'en') return;
    try {
      localStorage.setItem('playstation_language', newLang);
    } catch (e) {}
    applyDocumentLanguage(newLang);
    set({
      language: newLang,
      isEn: newLang === 'en',
      isAr: newLang === 'ar',
      t: makeTranslator(newLang),
    });
  },

  toggleLanguage: () => {
    const next = get().language === 'ar' ? 'en' : 'ar';
    get().setLanguage(next);
  },
}));

export default useLanguageStore;
