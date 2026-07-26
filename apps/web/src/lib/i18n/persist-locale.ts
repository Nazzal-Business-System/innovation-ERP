import { LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, type Locale } from "./types";

export function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "ar" ? "ar" : "en";
}
