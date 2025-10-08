import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', // Use 'en' if the detected language is not available
    debug: true, // Logs info to console, helpful for development
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    backend: {
      // Path where your translation files will be
      loadPath: '/locales/{{lng}}/translation.json',
    },
  });

export default i18n;
