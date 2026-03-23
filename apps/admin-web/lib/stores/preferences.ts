'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { trackPilotEvent } from '@/lib/analytics/client';
import { syncToCloud } from '@/lib/services/preferences-sync';

/* ═══════════════════════════════════════════════
   HOMETOWN PREFERENCES STORE
   Persisted to localStorage — no account needed
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
        trackPilotEvent('hometown_set', {
          metadata: {
            province,
            district: district ?? null,
            municipality: municipality ?? null,
          },
        });
        // Cloud sync if logged in
        try {
          const { useAuth } = require('@/lib/hooks/use-auth');
          const { user } = useAuth.getState();
          if (user?.id) {
            syncToCloud(user.id, { province, district: district ?? undefined, municipality: municipality ?? undefined });
          }
        } catch { /* not logged in or SSR */ }
      },

      clearHometown: () =>
        set({
          province: null,
          district: null,
          municipality: null,
          hasSetHometown: false,
        }),

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
