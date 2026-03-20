import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/* ═══════════════════════════════════════════════
   CLOUD-SYNCED PREFERENCES
   Merge localStorage ↔ Supabase user_preferences
   ═══════════════════════════════════════════════ */

// Debounce timer for syncToCloud calls
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 1500;

/**
 * On login, merge localStorage preferences with cloud-stored preferences.
 * Strategy: union watchlists, cloud wins for hometown, take higher streaks.
 */
export async function mergeOnLogin(userId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;

  // Read local stores
  const localPrefs = safeParseJSON(localStorage.getItem('nepal-najar-preferences'));
  const localWatchlist = safeParseJSON(localStorage.getItem('nepal-najar-watchlist'));
  const localEngagement = safeParseJSON(localStorage.getItem('nepal-najar-engagement'));

  // Read cloud
  const { data: cloud } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Merge hometown: cloud wins if it has data
  const mergedProvince = cloud?.province ?? localPrefs?.state?.province ?? null;
  const mergedDistrict = cloud?.district ?? localPrefs?.state?.district ?? null;
  const mergedMunicipality = cloud?.municipality ?? localPrefs?.state?.municipality ?? null;
  const hasHometown = !!(mergedProvince);

  // Merge watchlist: union of both
  const cloudWatchlist: string[] = cloud?.watchlist ?? [];
  const localWatchedIds: string[] = localWatchlist?.state?.watchedProjectIds ?? [];
  const mergedWatchlist = Array.from(new Set([...cloudWatchlist, ...localWatchedIds]));

  // Merge streaks: take higher values
  const cloudStreak = cloud?.streak_data as Record<string, unknown> | null;
  const localCurrentStreak = localEngagement?.state?.currentStreak ?? 0;
  const localLongestStreak = localEngagement?.state?.longestStreak ?? 0;
  const cloudCurrentStreak = (cloudStreak?.currentStreak as number) ?? 0;
  const cloudLongestStreak = (cloudStreak?.longestStreak as number) ?? 0;

  const mergedCurrentStreak = Math.max(localCurrentStreak, cloudCurrentStreak);
  const mergedLongestStreak = Math.max(localLongestStreak, cloudLongestStreak);

  // Write merged result to cloud
  const mergedStreakData = {
    currentStreak: mergedCurrentStreak,
    longestStreak: mergedLongestStreak,
    lastVisitDate: localEngagement?.state?.lastVisitDate ?? cloudStreak?.lastVisitDate ?? null,
  };

  await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      province: mergedProvince,
      district: mergedDistrict,
      municipality: mergedMunicipality,
      watchlist: mergedWatchlist,
      streak_data: mergedStreakData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  // Write merged result back to localStorage stores
  if (localPrefs?.state) {
    localPrefs.state.province = mergedProvince;
    localPrefs.state.district = mergedDistrict;
    localPrefs.state.municipality = mergedMunicipality;
    localPrefs.state.hasSetHometown = hasHometown;
    localStorage.setItem('nepal-najar-preferences', JSON.stringify(localPrefs));
  }

  if (localWatchlist?.state) {
    localWatchlist.state.watchedProjectIds = mergedWatchlist;
    localStorage.setItem('nepal-najar-watchlist', JSON.stringify(localWatchlist));
  }

  if (localEngagement?.state) {
    localEngagement.state.currentStreak = mergedCurrentStreak;
    localEngagement.state.longestStreak = mergedLongestStreak;
    localStorage.setItem('nepal-najar-engagement', JSON.stringify(localEngagement));
  }
}

/**
 * Debounced upsert of preference data to the cloud.
 * Call this whenever the user changes a preference while logged in.
 */
export function syncToCloud(
  userId: string,
  data: {
    watchlist?: string[];
    province?: string;
    district?: string;
    municipality?: string;
    streak_data?: Record<string, unknown>;
  },
) {
  if (_syncTimer) clearTimeout(_syncTimer);

  _syncTimer = setTimeout(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.from('user_preferences').upsert(
      {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Load preferences from the cloud for a given user.
 */
export async function loadFromCloud(userId: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/* ─── Helpers ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseJSON(raw: string | null): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
