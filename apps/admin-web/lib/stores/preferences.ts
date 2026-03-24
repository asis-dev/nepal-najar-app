'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trackPilotEvent } from '@/lib/analytics/client';

/* ═══════════════════════════════════════════════
   USER PREFERENCES — UNIFIED STORE
   Persisted to localStorage for all users.
   Synced to server (profiles.preferences JSONB)
   for authenticated users via debounced API calls.
   ═══════════════════════════════════════════════ */

export interface UserPreferences {
  locale: 'en' | 'ne';
  province?: string;
  district?: string;
  categoriesOfInterest?: string[];
  feedTab: 'for-you' | 'following' | 'trending';
  lastSeenTimestamp?: string;
  onboardingComplete?: boolean;
  theme?: 'dark' | 'light';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  locale: 'en',
  feedTab: 'for-you',
};

/* ─── Debounced server sync ─── */

let _prefSyncTimer: ReturnType<typeof setTimeout> | null = null;
const PREF_SYNC_DEBOUNCE_MS = 500;

function debouncedServerSync(partial: Partial<UserPreferences>) {
  if (_prefSyncTimer) clearTimeout(_prefSyncTimer);
  _prefSyncTimer = setTimeout(async () => {
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
    } catch {
      /* offline or not logged in — localStorage is source of truth */
    }
  }, PREF_SYNC_DEBOUNCE_MS);
}

/** Check if user is authenticated (lazy import to avoid circular deps) */
function isLoggedIn(): boolean {
  try {
    const { useAuth } = require('@/lib/hooks/use-auth');
    return !!useAuth.getState().user?.id;
  } catch {
    return false;
  }
}

function syncIfLoggedIn(partial: Partial<UserPreferences>) {
  if (isLoggedIn()) {
    debouncedServerSync(partial);
  }
}

/* ─── Store types ─── */

interface UserPreferencesState extends UserPreferences {
  /** True while server fetch is in-flight */
  _syncing: boolean;
}

interface UserPreferencesActions {
  setLocale: (locale: 'en' | 'ne') => void;
  setProvince: (province: string | undefined) => void;
  setDistrict: (district: string | undefined) => void;
  setLocation: (province?: string, district?: string) => void;
  setCategoriesOfInterest: (categories: string[]) => void;
  setFeedTab: (tab: 'for-you' | 'following' | 'trending') => void;
  setLastSeenTimestamp: (ts: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  /** Bulk-update multiple preferences at once */
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  /** Fetch from server and merge (local wins for conflicts) */
  syncFromServer: () => Promise<void>;
  /** Push current local state to server */
  syncToServer: () => Promise<void>;
  /** Get a plain UserPreferences object (no actions/internal state) */
  getPreferences: () => UserPreferences;
}

export const useUserPreferencesStore = create<UserPreferencesState & UserPreferencesActions>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,
      _syncing: false,

      setLocale: (locale) => {
        set({ locale });
        syncIfLoggedIn({ locale });
        trackPilotEvent('preference_changed', { metadata: { key: 'locale', value: locale } });
      },

      setProvince: (province) => {
        set({ province });
        syncIfLoggedIn({ province });
      },

      setDistrict: (district) => {
        set({ district });
        syncIfLoggedIn({ district });
      },

      setLocation: (province, district) => {
        set({ province, district });
        syncIfLoggedIn({ province, district });
        trackPilotEvent('preference_changed', {
          metadata: { key: 'location', province: province ?? '', district: district ?? '' },
        });
      },

      setCategoriesOfInterest: (categories) => {
        set({ categoriesOfInterest: categories });
        syncIfLoggedIn({ categoriesOfInterest: categories });
      },

      setFeedTab: (tab) => {
        set({ feedTab: tab });
        syncIfLoggedIn({ feedTab: tab });
      },

      setLastSeenTimestamp: (ts) => {
        set({ lastSeenTimestamp: ts });
        syncIfLoggedIn({ lastSeenTimestamp: ts });
      },

      setOnboardingComplete: (complete) => {
        set({ onboardingComplete: complete });
        syncIfLoggedIn({ onboardingComplete: complete });
      },

      setTheme: (theme) => {
        set({ theme });
        syncIfLoggedIn({ theme });
      },

      updatePreferences: (partial) => {
        set(partial);
        syncIfLoggedIn(partial);
      },

      syncFromServer: async () => {
        if (get()._syncing) return;
        set({ _syncing: true });

        try {
          const res = await fetch('/api/preferences');
          if (!res.ok) {
            set({ _syncing: false });
            return;
          }

          const { preferences: serverPrefs } = (await res.json()) as {
            preferences: Partial<UserPreferences> | null;
          };

          if (!serverPrefs) {
            set({ _syncing: false });
            return;
          }

          // Merge: local wins for conflicts (user just set them locally)
          const local = get().getPreferences();
          const merged: Partial<UserPreferences> = { ...serverPrefs };

          // Local overrides server for these fields if locally set
          if (local.locale) merged.locale = local.locale;
          if (local.province) merged.province = local.province;
          if (local.district) merged.district = local.district;
          if (local.feedTab && local.feedTab !== DEFAULT_PREFERENCES.feedTab) {
            merged.feedTab = local.feedTab;
          }
          if (local.categoriesOfInterest?.length) {
            merged.categoriesOfInterest = local.categoriesOfInterest;
          }
          if (local.onboardingComplete !== undefined) {
            merged.onboardingComplete = local.onboardingComplete;
          }
          if (local.theme) merged.theme = local.theme;

          // Server wins for lastSeenTimestamp (take the more recent one)
          if (serverPrefs.lastSeenTimestamp && local.lastSeenTimestamp) {
            merged.lastSeenTimestamp =
              serverPrefs.lastSeenTimestamp > local.lastSeenTimestamp
                ? serverPrefs.lastSeenTimestamp
                : local.lastSeenTimestamp;
          }

          set({ ...merged, _syncing: false });

          // Push merged result back to server
          try {
            await fetch('/api/preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(merged),
            });
          } catch { /* best-effort */ }
        } catch {
          set({ _syncing: false });
        }
      },

      syncToServer: async () => {
        const prefs = get().getPreferences();
        try {
          await fetch('/api/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs),
          });
        } catch { /* silent */ }
      },

      getPreferences: (): UserPreferences => {
        const s = get();
        return {
          locale: s.locale,
          province: s.province,
          district: s.district,
          categoriesOfInterest: s.categoriesOfInterest,
          feedTab: s.feedTab,
          lastSeenTimestamp: s.lastSeenTimestamp,
          onboardingComplete: s.onboardingComplete,
          theme: s.theme,
        };
      },
    }),
    {
      name: 'nepal-najar-user-preferences',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        locale: state.locale,
        province: state.province,
        district: state.district,
        categoriesOfInterest: state.categoriesOfInterest,
        feedTab: state.feedTab,
        lastSeenTimestamp: state.lastSeenTimestamp,
        onboardingComplete: state.onboardingComplete,
        theme: state.theme,
      }),
    },
  ),
);


/* ═══════════════════════════════════════════════
   HOMETOWN PREFERENCES STORE (legacy — kept for
   backward compat; delegates to unified store)
   ═══════════════════════════════════════════════ */

interface HometownPreferences {
  province: string | null;
  district: string | null;
  municipality: string | null;
  hasSetHometown: boolean;
  showPicker: boolean;
}

interface PreferencesActions {
  setHometown: (province: string, district?: string, municipality?: string) => void;
  clearHometown: () => void;
  setShowPicker: (show: boolean) => void;
  dismissPicker: () => void;
}

export const usePreferencesStore = create<HometownPreferences & PreferencesActions>()(
  persist(
    (set) => ({
      province: null,
      district: null,
      municipality: null,
      hasSetHometown: false,
      showPicker: false,

      setHometown: (province, district, municipality) => {
        set({
          province,
          district: district ?? null,
          municipality: municipality ?? null,
          hasSetHometown: true,
          showPicker: false,
        });

        // Also update the unified preferences store
        useUserPreferencesStore.getState().setLocation(province, district);

        trackPilotEvent('hometown_set', {
          metadata: {
            province,
            district: district ?? null,
            municipality: municipality ?? null,
          },
        });

        // Legacy cloud sync
        try {
          const { syncToCloud } = require('@/lib/services/preferences-sync');
          const { useAuth } = require('@/lib/hooks/use-auth');
          const { user } = useAuth.getState();
          if (user?.id) {
            syncToCloud(user.id, { province, district: district ?? undefined, municipality: municipality ?? undefined });
          }
        } catch { /* not logged in or SSR */ }
      },

      clearHometown: () => {
        set({
          province: null,
          district: null,
          municipality: null,
          hasSetHometown: false,
        });
        useUserPreferencesStore.getState().setLocation(undefined, undefined);
      },

      setShowPicker: (show) => set({ showPicker: show }),

      dismissPicker: () => set({ showPicker: false }),
    }),
    {
      name: 'nepal-najar-preferences',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        province: state.province,
        district: state.district,
        municipality: state.municipality,
        hasSetHometown: state.hasSetHometown,
      }),
    },
  ),
);

/* ═══════════════════════════════════════════════
   WATCHLIST STORE
   Bookmark projects — localStorage for anonymous,
   synced to /api/watchlist for authenticated users
   ═══════════════════════════════════════════════ */

interface WatchlistState {
  watchedProjectIds: string[];
  /** True while an initial server fetch is in flight */
  _syncing: boolean;
}

interface WatchlistActions {
  toggleWatch: (projectId: string) => void;
  isWatched: (projectId: string) => boolean;
  clearWatchlist: () => void;
  /** Fetch watchlist from the server, merge with localStorage */
  syncFromServer: () => Promise<void>;
  /** Push entire localStorage watchlist to the server (bulk) */
  syncToServer: () => Promise<void>;
}

/** Fire-and-forget helper to add/remove a single item on the server */
function serverToggle(promiseId: string, action: 'add' | 'remove') {
  const method = action === 'add' ? 'POST' : 'DELETE';
  fetch('/api/watchlist', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promise_id: promiseId }),
  }).catch(() => {
    /* silent — localStorage is the source of truth for offline */
  });
}

export const useWatchlistStore = create<WatchlistState & WatchlistActions>()(
  persist(
    (set, get) => ({
      watchedProjectIds: [],
      _syncing: false,

      toggleWatch: (projectId) => {
        set((state) => {
          const exists = state.watchedProjectIds.includes(projectId);
          const newList = exists
            ? state.watchedProjectIds.filter((id) => id !== projectId)
            : [...state.watchedProjectIds, projectId];

          trackPilotEvent(exists ? 'watchlist_remove' : 'watchlist_add', {
            metadata: {
              projectId,
              watchlistSize: newList.length,
            },
          });

          // Sync individual toggle to server if logged in
          try {
            const { useAuth } = require('@/lib/hooks/use-auth');
            const { user } = useAuth.getState();
            if (user?.id) {
              serverToggle(projectId, exists ? 'remove' : 'add');
              // Also keep legacy user_preferences in sync
              const { syncToCloud } = require('@/lib/services/preferences-sync');
              syncToCloud(user.id, { watchlist: newList });
            }
          } catch { /* not logged in or SSR */ }

          return { watchedProjectIds: newList };
        });
      },

      isWatched: (projectId) => get().watchedProjectIds.includes(projectId),

      clearWatchlist: () => {
        const current = get().watchedProjectIds;
        set({ watchedProjectIds: [] });

        // Remove all from server if logged in
        try {
          const { useAuth } = require('@/lib/hooks/use-auth');
          const { user } = useAuth.getState();
          if (user?.id) {
            for (const id of current) {
              serverToggle(id, 'remove');
            }
            const { syncToCloud } = require('@/lib/services/preferences-sync');
            syncToCloud(user.id, { watchlist: [] });
          }
        } catch { /* not logged in or SSR */ }
      },

      syncFromServer: async () => {
        if (get()._syncing) return;
        set({ _syncing: true });

        try {
          const res = await fetch('/api/watchlist');
          if (!res.ok) {
            set({ _syncing: false });
            return;
          }

          const { promise_ids } = (await res.json()) as { promise_ids: string[] };
          const local = get().watchedProjectIds;

          // Merge: union of server + local (server is authoritative, but keep any local-only items)
          const merged = Array.from(new Set([...promise_ids, ...local]));

          set({ watchedProjectIds: merged, _syncing: false });

          // Push any local-only items to the server so they persist
          const serverSet = new Set(promise_ids);
          const localOnly = local.filter((id) => !serverSet.has(id));
          for (const id of localOnly) {
            serverToggle(id, 'add');
          }
        } catch {
          set({ _syncing: false });
        }
      },

      syncToServer: async () => {
        const ids = get().watchedProjectIds;
        // Push all items — upsert is idempotent so dupes are safe
        for (const id of ids) {
          serverToggle(id, 'add');
        }
      },
    }),
    {
      name: 'nepal-najar-watchlist',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        watchedProjectIds: state.watchedProjectIds,
      }),
    },
  ),
);

/* ═══════════════════════════════════════════════
   NEPAL PROVINCES & DISTRICTS
   ═══════════════════════════════════════════════ */

export const NEPAL_PROVINCES = [
  {
    name: 'Koshi',
    name_ne: 'कोशी',
    districts: ['Taplejung', 'Panchthar', 'Ilam', 'Jhapa', 'Morang', 'Sunsari', 'Dhankuta', 'Terhathum', 'Sankhuwasabha', 'Bhojpur', 'Solukhumbu', 'Okhaldhunga', 'Khotang', 'Udayapur'],
  },
  {
    name: 'Madhesh',
    name_ne: 'मधेश',
    districts: ['Saptari', 'Siraha', 'Dhanusha', 'Mahottari', 'Sarlahi', 'Rautahat', 'Bara', 'Parsa'],
  },
  {
    name: 'Bagmati',
    name_ne: 'बागमती',
    districts: ['Dolakha', 'Sindhupalchok', 'Rasuwa', 'Dhading', 'Nuwakot', 'Kathmandu', 'Bhaktapur', 'Lalitpur', 'Kavrepalanchok', 'Ramechhap', 'Sindhuli', 'Makwanpur', 'Chitwan'],
  },
  {
    name: 'Gandaki',
    name_ne: 'गण्डकी',
    districts: ['Gorkha', 'Manang', 'Mustang', 'Myagdi', 'Kaski', 'Lamjung', 'Tanahu', 'Nawalparasi East', 'Syangja', 'Parbat', 'Baglung'],
  },
  {
    name: 'Lumbini',
    name_ne: 'लुम्बिनी',
    districts: ['Rukum East', 'Rolpa', 'Pyuthan', 'Gulmi', 'Arghakhanchi', 'Palpa', 'Nawalparasi West', 'Rupandehi', 'Kapilvastu', 'Dang', 'Banke', 'Bardiya'],
  },
  {
    name: 'Karnali',
    name_ne: 'कर्णाली',
    districts: ['Dolpa', 'Mugu', 'Humla', 'Jumla', 'Kalikot', 'Dailekh', 'Jajarkot', 'Rukum West', 'Salyan', 'Surkhet'],
  },
  {
    name: 'Sudurpashchim',
    name_ne: 'सुदूरपश्चिम',
    districts: ['Bajura', 'Bajhang', 'Darchula', 'Baitadi', 'Dadeldhura', 'Doti', 'Achham', 'Kailali', 'Kanchanpur'],
  },
] as const;
