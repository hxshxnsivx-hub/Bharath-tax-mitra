import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { loadFontForLanguage } from './fonts';

// Import translations
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import taTranslations from './locales/ta.json';
import teTranslations from './locales/te.json';
import mrTranslations from './locales/mr.json';
import bnTranslations from './locales/bn.json';
import guTranslations from './locales/gu.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      ta: { translation: taTranslations },
      te: { translation: teTranslations },
      mr: { translation: mrTranslations },
      bn: { translation: bnTranslations },
      gu: { translation: guTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'btm_lang',
    },
  }).then(() => {
    // Restore saved language from localStorage on startup.
    const savedLang = localStorage.getItem('btm_lang');
    if (savedLang && SUPPORTED_LANGUAGES.some(l => l.code === savedLang)) {
      i18n.changeLanguage(savedLang);
    }
    // Apply side effects for the language we actually start on. `changeLanguage`
    // above is a no-op when the detected and saved language already match, so it
    // does NOT fire `languageChanged` — without this explicit call a reload into
    // a saved non-English language would leave <html lang> and the font unset.
    applyLanguageSideEffects(i18n.language);
  });

// Global side effects of the active language: persist the choice, keep
// <html lang> truthful (task 4.12.3 — without it a screen reader announces
// Devanagari/Tamil with English pronunciation), and fetch the script's font on
// demand (OPT-UI.7). Centralised so both a runtime change AND the startup
// restore above go through the same path — the language selector, the pre-auth
// flow, and a reload into a saved non-English language all stay consistent.
function applyLanguageSideEffects(lng: string): void {
  try {
    localStorage.setItem('btm_lang', lng);
  } catch {
    /* private mode — language still applies for this session */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
  // Fire-and-forget — the font stack falls back to system-ui until the woff2
  // arrives; loadFontForLanguage is a no-op for Latin (en) and dedupes.
  void loadFontForLanguage(lng);
}

i18n.on('languageChanged', applyLanguageSideEffects);

export default i18n;
