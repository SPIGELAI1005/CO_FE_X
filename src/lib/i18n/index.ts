import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const LOCALE_STORAGE_KEY = "cofex-locale";
export const supportedLocales = ["en", "de"] as const;
export type AppLocale = (typeof supportedLocales)[number];

function normalizeLocale(raw: string | null | undefined): AppLocale {
  if (raw?.toLowerCase().startsWith("de")) return "de";
  return "en";
}

export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function detectInitialLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return normalizeLocale(stored);
  const browser = navigator.language || navigator.languages?.[0];
  return normalizeLocale(browser);
}

export function syncDocumentLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

export function setAppLocale(locale: AppLocale) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  syncDocumentLocale(locale);
  void i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: typeof window !== "undefined" ? detectInitialLocale() : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

syncDocumentLocale(detectInitialLocale());

export default i18n;
