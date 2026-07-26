export type Locale = "en" | "ar";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "blue" | "indigo" | "violet" | "emerald" | "amber" | "rose";
export type Density = "comfortable" | "compact";
export type BorderRadius = "soft" | "medium" | "sharp";
export type CalendarStyle = "modern" | "compact" | "system";
export type DetailsPageLayout = "workspace" | "executive" | "compact" | "focus";

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  density: Density;
  radius: BorderRadius;
  calendarStyle: CalendarStyle;
  detailsPageLayout: DetailsPageLayout;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "dark",
  accent: "indigo",
  density: "comfortable",
  radius: "medium",
  calendarStyle: "modern",
  detailsPageLayout: "workspace",
};

export const APPEARANCE_STORAGE_KEY = "ierp_appearance";
export const LOCALE_STORAGE_KEY = "ierp_locale";
export const LOCALE_COOKIE_KEY = "ierp_locale";

export type TranslationDictionary = Record<string, string>;
