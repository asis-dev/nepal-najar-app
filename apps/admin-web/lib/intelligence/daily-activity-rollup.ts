/**
 * Daily Activity Rollup
 *
 * Aggregates today's intelligence signals per promise into promise_daily_activity.
 * Called at the end of each sweep to answer "Was any work done today?"
 */

import { getSupabase } from '@/lib/supabase/server';

/** Nepal timezone offset: UTC+5:45 */
function getTodayNepalTime(): { todayStart: string; tomorrowStart: string; dateStr: string } {
  const now = new Date();
  // Nepal is UTC+5:45 = 345 minutes ahead
  const nepalOffset = 345;
  const nepalTime = new Date(now.getTime() + nepalOffset * 60_000);
  const dateStr = nepalTime.toISOString().slice(0, 10);

  // Today start in UTC: midnight Nepal time = midnight - 5:45 = previous day 18:15 UTC
  const todayNepalMidnight = new Date(`${dateStr}T00:00:00+05:45`);
  const tomorrowNepalMidnight = new Date(todayNepalMidnight.getTime() + 86_400_000);

  return {
    todayStart: todayNepalMidnight.toISOString(),
    tomorrowStart: tomorrowNepalMidnight.toISOString(),
    dateStr,
  };
}

interface SignalRow {
  id: string;
  matched_promise_ids: number[] | null;
  classification: string | null;
  confidence: number | null;
  relevance_score: number | null;
  title: string | null;
  source_id: string | null;
}

interface PromiseAccumulator {
  signalCount: number;
  confirms: number;
  contradicts: number;
  neutral: number;
  signals: { id: string; score: number }[];
  bestHeadline: string | null;
  maxConfidence: number;
  sourceTypes: Set<string>;
}

export async function computeDailyActivityRollup(): Promise<{
  promisesActive: number;
  totalSignals: number;
}> {
  const supabase = getSupabase();
  const { todayStart, tomorrowStart, dateStr } = getTodayNepalTime();

  console.log(`[DailyRollup] Computing for ${dateStr} (${todayStart} to ${tomorrowStart})`);

  // 1. Fetch today's classified signals
  const { data: signals, error: signalError } = await supabase
    .from('intelligence_signals')
    .select('id, matched_promise_ids, classification, confidence, relevance_score, title, source_id')
    .eq('tier1_processed', true)
    .gte('discovered_at', todayStart)
    .lt('discovered_at', tomorrowStart);

  if (signalError) {
    console.error('[DailyRollup] Error fetching signals:', signalError.message);
    return { promisesActive: 0, totalSignals: 0 };
  }

  const rows = (signals || []) as unknown as SignalRow[];

  // 2. Also check scraped_articles for additional coverage
  const { data: articles } = await supabase
    .from('scraped_articles')
    .select('id, promise_ids, classification, confidence, headline, source_name')
    .gte('scraped_at', todayStart)
    .lt('scraped_at', tomorrowStart);

  // 3. Group by promise_id
  const promiseMap = new Map<string, PromiseAccumulator>();

  function ensurePromise(pid: string): PromiseAccumulator {
    if (!promiseMap.has(pid)) {
      promiseMap.set(pid, {
        signalCount: 0,
        confirms: 0,
        contradicts: 0,
        neutral: 0,
        signals: [],
        bestHeadline: null,
        maxConfidence: 0,
        sourceTypes: new Set(),
      });
    }
    return promiseMap.get(pid)!;
  }

  // Process intelligence signals
  for (const signal of rows) {
    const promiseIds = signal.matched_promise_ids || [];
    for (const pid of promiseIds) {
      const acc = ensurePromise(String(pid));
      acc.signalCount++;

      const cls = signal.classification || 'neutral';
      if (cls === 'confirms' || cls === 'budget_allocation' || cls === 'policy_change') {
        acc.confirms++;
      } else if (cls === 'contradicts') {
        acc.contradicts++;
      } else {
        acc.neutral++;
      }

      const score = signal.relevance_score || 0;
      acc.signals.push({ id: signal.id, score });

      const conf = signal.confidence || 0;
      if (conf > acc.maxConfidence) {
        acc.maxConfidence = conf;
        acc.bestHeadline = signal.title;
      }

      if (signal.source_id) {
        acc.sourceTypes.add(signal.source_id);
      }
    }
  }

  // Process scraped articles
  for (const article of articles || []) {
    const promiseIds = (article.promise_ids as string[]) || [];
    for (const pid of promiseIds) {
      const acc = ensurePromise(pid);
      // Only count if not already counted via signals
      // scraped_articles use string IDs in promise_ids
      acc.signalCount++;

      const cls = (article.classification as string) || 'neutral';
      if (cls === 'confirms') {
        acc.confirms++;
      } else if (cls === 'contradicts') {
        acc.contradicts++;
      } else {
        acc.neutral++;
      }

      const conf = Number(article.confidence) || 0;
      if (conf > acc.maxConfidence) {
        acc.maxConfidence = conf;
        acc.bestHeadline = article.headline as string;
      }

      if (article.source_name) {
        acc.sourceTypes.add(article.source_name as string);
      }
    }
  }

  // 4. Upsert into promise_daily_activity
  const upsertRows = Array.from(promiseMap.entries()).map(([promiseId, acc]) => {
    // Pick top 5 signal IDs by relevance score
    const topSignals = acc.signals
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.id);

    return {
      promise_id: promiseId,
      date: dateStr,
      signal_count: acc.signalCount,
      confirms_count: acc.confirms,
      contradicts_count: acc.contradicts,
      neutral_count: acc.neutral,
      top_signal_ids: topSignals,
      top_headline: acc.bestHeadline,
      max_confidence: Number(acc.maxConfidence.toFixed(4)),
      source_types: Array.from(acc.sourceTypes),
      updated_at: new Date().toISOString(),
    };
  });

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('promise_daily_activity')
      .upsert(upsertRows, { onConflict: 'promise_id,date' });

    if (upsertError) {
      console.error('[DailyRollup] Upsert error:', upsertError.message);
    }
  }

  // 5. Update promises.last_activity_date and last_activity_signal_count
  for (const [promiseId, acc] of promiseMap.entries()) {
    const { error: updateError } = await supabase
      .from('promises')
      .update({
        last_activity_date: dateStr,
        last_activity_signal_count: acc.signalCount,
      })
      .eq('id', promiseId);

    if (updateError) {
      // Non-fatal — promise might not exist in DB yet (seed data only)
      console.warn(`[DailyRollup] Could not update promise ${promiseId}: ${updateError.message}`);
    }
  }

  const totalSignals = rows.length + (articles?.length || 0);
  console.log(
    `[DailyRollup] Daily rollup: ${promiseMap.size} promises had activity, ${totalSignals} total signals`,
  );

  return {
    promisesActive: promiseMap.size,
    totalSignals,
  };
}
