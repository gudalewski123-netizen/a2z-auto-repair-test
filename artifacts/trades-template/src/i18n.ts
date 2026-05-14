// i18next initialization. Imported once from main.tsx (no provider needed).
// Detects language from localStorage > navigator > html lang attribute,
// falling back to English. Persists user's choice to localStorage.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { en } from "./locales/en";
import { es } from "./locales/es";
import { zh } from "./locales/zh";
import { tl } from "./locales/tl";
import { vi } from "./locales/vi";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",   nativeLabel: "English" },
  { code: "es", label: "Spanish",   nativeLabel: "Español" },
  { code: "zh", label: "Chinese",   nativeLabel: "中文" },
  { code: "tl", label: "Tagalog",   nativeLabel: "Tagalog" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      // Priority order: explicit user choice (localStorage) > browser > <html lang>
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    resources: {
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
      tl: { translation: tl },
      vi: { translation: vi },
    },
  });

export default i18n;
