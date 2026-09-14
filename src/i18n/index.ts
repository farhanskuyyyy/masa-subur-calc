import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import id from './locales/id.json';

const LANGUAGE_KEY = 'language';

const getInitialLanguage = (): string => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem('i18nextLng');
    if (saved) {
      if (saved.startsWith('id')) return 'id';
      if (saved.startsWith('en')) return 'en';
    }

    // Detect browser language on first visit
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('id')) {
        return 'id';
      }
    }
  } catch (err) {
    console.warn('Could not read stored language preference:', err);
  }
  // Default is 'en'
  return 'en';
};

const initialLang = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles XSS prevention
    },
  });

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lng);
    localStorage.setItem('i18nextLng', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (err) {
    console.warn('Could not save language to localStorage:', err);
  }
});

// Set HTML document lang attribute immediately
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

export default i18n;
