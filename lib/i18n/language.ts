/**
 * Shared language utilities for RTI-Pro application
 * Provides consistent language preference management across all pages
 */

export type Language = "English" | "हिन्दी" | "मराठी";

export const LANGUAGE_KEY = "rti-language";

/**
 * Get the current language preference from localStorage
 * Safe for server-side rendering
 */
export function getLanguage(): Language {
  if (typeof window === "undefined") return "English";
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === "हिन्दी" || stored === "मराठी") return stored;
  return "English";
}

/**
 * Set the language preference in localStorage
 */
export function setLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUAGE_KEY, language);
}
