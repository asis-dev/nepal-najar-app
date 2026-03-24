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

const messages: Record<Locale, Messages> = { en, ne };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // On mount, read from the unified preferences store (which reads from localStorage)
  useEffect(() => {
    // Try the unified preferences store first
    const prefLocale = useUserPreferencesStore.getState().locale;
    if (prefLocale === 'en' || prefLocale === 'ne') {
      setLocaleState(prefLocale);
      return;
    }

    // Fallback: legacy localStorage key
    const storedLocale = localStorage.getItem('nepal-najar-locale') as Locale | null;
    if (storedLocale === 'en' || storedLocale === 'ne') {
      setLocaleState(storedLocale);
      // Migrate to unified store
      useUserPreferencesStore.getState().setLocale(storedLocale);
    }
  }, []);

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
      localStorage.setItem('nepal-najar-locale', newLocale);
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

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
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

export function useTranslation() {
  return useI18n().t;
}
