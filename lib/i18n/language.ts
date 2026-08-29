/**
 * Shared language utilities for RTI-Pro application
 * Provides consistent language preference management across all pages
 */

import { useCallback, useSyncExternalStore } from "react";

export type Language = "English" | "हिन्दी" | "मराठी";

export const LANGUAGE_KEY = "rti-language";

export const LANGUAGES: Language[] = ["English", "हिन्दी", "मराठी"];

/** Fired whenever the preference changes so every mounted page updates together. */
const LANGUAGE_EVENT = "rti-language-change";

function isLanguage(value: unknown): value is Language {
  return value === "English" || value === "हिन्दी" || value === "मराठी";
}

/**
 * Get the current language preference from localStorage
 * Safe for server-side rendering
 */
export function getLanguage(): Language {
  if (typeof window === "undefined") return "English";
  const stored = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : "English";
}

/**
 * Set the language preference in localStorage
 */
export function setLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUAGE_KEY, language);
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(LANGUAGE_EVENT, onChange);
  // `storage` covers the preference being changed in another tab.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Read and update the language preference.
 *
 * Backed by the stored value rather than mount-time state, so the choice
 * survives client navigation between Home, Voice, Manual and Tracking and
 * every mounted page re-renders as soon as it changes.
 */
export function useLanguage(): [Language, (language: Language) => void] {
  const language = useSyncExternalStore(subscribe, getLanguage, () => "English" as Language);
  const change = useCallback((next: Language) => setLanguage(next), []);
  return [language, change];
}
