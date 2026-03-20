'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

      setHometown: (province, district, municipality) =>
        set({
          province,
          district: district ?? null,
          municipality: municipality ?? null,
          hasSetHometown: true,
          showPicker: false,
        }),

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
   Bookmark projects — localStorage for anonymous
   ═══════════════════════════════════════════════ */

interface WatchlistState {
  watchedProjectIds: string[];
}

interface WatchlistActions {
  toggleWatch: (projectId: string) => void;
  isWatched: (projectId: string) => boolean;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistState & WatchlistActions>()(
  persist(
    (set, get) => ({
      watchedProjectIds: [],

      toggleWatch: (projectId) =>
        set((state) => {
          const exists = state.watchedProjectIds.includes(projectId);
          return {
            watchedProjectIds: exists
              ? state.watchedProjectIds.filter((id) => id !== projectId)
              : [...state.watchedProjectIds, projectId],
          };
        }),

      isWatched: (projectId) => get().watchedProjectIds.includes(projectId),

      clearWatchlist: () => set({ watchedProjectIds: [] }),
    }),
    {
      name: 'nepal-najar-watchlist',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
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
