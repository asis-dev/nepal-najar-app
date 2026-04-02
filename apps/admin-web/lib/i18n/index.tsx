'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import en from '@/messages/en.json';
import ne from '@/messages/ne.json';
import { useUserPreferencesStore } from '@/lib/stores/preferences';

export type Locale = 'en' | 'ne';
type Messages = typeof en;

/** Detect Devanagari script (Nepali) in a string */
const HAS_DEVANAGARI = /[\u0900-\u097F]/;

const messages: Record<Locale, Messages> = { en, ne };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /**
   * Pick the correct language string from a data field pair (e.g. title / title_ne).
   * Handles the common case where DB `title` is actually in Nepali (scraped from Nepali sources).
   * Usage: localizeField(item.title, item.title_ne, 'News update')
   */
  localizeField: (text?: string | null, textNe?: string | null, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    // Try the unified preferences store first
    try {
      const prefLocale = useUserPreferencesStore.getState().locale;
      if (prefLocale === 'en' || prefLocale === 'ne') return prefLocale;
    } catch {}
    // Fallback: legacy localStorage key
    try {
      const storedLocale = localStorage.getItem('nepalrepublic-locale') as Locale | null;
      if (storedLocale === 'en' || storedLocale === 'ne') return storedLocale;
    } catch {}
    return 'en';
  });

  // Subscribe to preference store locale changes (e.g. from server sync)
  useEffect(() => {
    const unsub = useUserPreferencesStore.subscribe((state) => {
      if (state.locale && state.locale !== locale) {
        setLocaleState(state.locale);
      }
    });
    return unsub;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);

    // Update unified preferences store (which handles server sync)
    useUserPreferencesStore.getState().setLocale(newLocale);

    // Keep legacy localStorage key in sync for backward compat
    if (typeof window !== 'undefined') {
      localStorage.setItem('nepalrepublic-locale', newLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const keys = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = messages[locale];
      for (const k of keys) {
        value = value?.[k];
      }
      if (typeof value !== 'string') return key;
      if (vars) {
        return value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
      }
      return value;
    },
    [locale],
  );

  /**
   * Root-cause fix for Nepali text appearing in English mode.
   * Many DB records have `title` in Nepali (scraped from Nepali sources) with `title_ne` null.
   * This detects Devanagari and picks the right field based on current locale.
   */
  const localizeField = useCallback(
    (text?: string | null, textNe?: string | null, fallback?: string): string => {
      const a = (text || '').trim();
      const b = (textNe || '').trim();
      const aIsNepali = HAS_DEVANAGARI.test(a);
      const bIsNepali = HAS_DEVANAGARI.test(b);

      if (locale === 'ne') {
        // Nepali mode: prefer Nepali text from either field
        if (b) return b;
        if (aIsNepali) return a;
        return a || fallback || '';
      }

      // English mode: avoid Devanagari
      if (a && !aIsNepali) return a;
      if (b && !bIsNepali) return b;
      // Both fields are Nepali or empty — use fallback
      return fallback || '';
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, localizeField }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export function useLocale() {
  return useI18n().locale;
}

/**
 * Standalone locale-aware field picker (for use outside React components / hooks).
 * Detects Devanagari script and picks the correct language text.
 */
export function pickLocalizedField(
  locale: string,
  text?: string | null,
  textNe?: string | null,
  fallback?: string,
): string {
  const a = (text || '').trim();
  const b = (textNe || '').trim();
  const aIsNepali = HAS_DEVANAGARI.test(a);
  const bIsNepali = HAS_DEVANAGARI.test(b);

  if (locale === 'ne') {
    if (b) return b;
    if (aIsNepali) return a;
    return a || fallback || '';
  }

  // English mode: avoid Devanagari
  if (a && !aIsNepali) return a;
  if (b && !bIsNepali) return b;
  return fallback || '';
}

export function useTranslation() {
  return useI18n().t;
}
