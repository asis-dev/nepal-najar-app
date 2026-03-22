/**
 * Intelligence Sweep Orchestrator
 *
 * Runs the full 3-tier intelligence sweep:
 * 1. Collect signals from all sources (RSS, YouTube, search, social, existing scrapers)
 * 2. Classify and filter (Tier 1 — cheap AI)
 * 3. Deep analyze relevant signals (Tier 3 — smart AI)
 * 4. Update promises with evidence
 */

import { getSupabase } from '@/lib/supabase/server';
import { collectAllRSS } from './collectors/rss';
import { collectAllYouTube } from './collectors/youtube';
import { collectAllWebSearch } from './collectors/web-search';
import { collectAllSocial } from './collectors/social';
import { collectAllApify } from './collectors/apify';
import { collectGovPortals } from './collectors/gov-portal';
import { processSignalsBatch } from './brain';
// Translation pipeline (imported for future integration into processing)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { translateNepaliSignal, batchTranslateNepaliSignals } from './translate';
import { collectSocialEvidence } from './evidence/social-collector';
import { syncPromiseStatuses } from './promise-status-sync';
import { computeDailyActivityRollup } from './daily-activity-rollup';

async function upsertDailyQualityMetrics() {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('classification, confidence, relevance_score, review_required, review_status')
    .gte('discovered_at', `${today}T00:00:00.000Z`);

  const rows = signals || [];
  const total = rows.length;
  const relevant = rows.filter((r) => (r.relevance_score || 0) >= 0.3).length;
  const neutral = rows.filter((r) => r.classification === 'neutral').length;
  const confirms = rows.filter((r) => r.classification === 'confirms').length;
  const contradicts = rows.filter((r) => r.classification === 'contradicts').length;
  const reviewRequired = rows.filter((r) => r.review_required).length;
  const reviewOverrides = rows.filter((r) => r.review_status === 'edited').length;
  const avgConfidence =
    total === 0
      ? 0
      : rows.reduce((sum, row) => sum + (row.confidence || 0), 0) / total;

  await supabase.from('intelligence_quality_daily').upsert(
    {
      date: today,
      total_signals: total,
      relevant_signals: relevant,
      neutral_signals: neutral,
      confirms_signals: confirms,
      contradicts_signals: contradicts,
      avg_confidence: Number(avgConfidence.toFixed(4)),
      review_required_count: reviewRequired,
      review_overrides_count: reviewOverrides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'date' },
  );
}

interface SweepResult {
  sweepId: string;
  status: 'completed' | 'partial' | 'failed';
  duration: number;
  collection: {
    rss: { totalItems: number; newItems: number; errors: string[] };
    youtube: {
      videosFound: number;
      newVideos: number;
      captionsExtracted: number;
      errors: string[];
    };
    search: {
      queriesRun: number;
      resultsFound: number;
      newSignals: number;
      errors: string[];
    };
    social: { postsFound: number; newPosts: number; errors: string[] };
    apify: {
      profilesScraped: number;
      totalPosts: number;
      newPosts: number;
      videosWithTranscript: number;
      errors: string[];
    };
    legacy: {
      articlesFound: number;
      newArticles: number;
      errors: string[];
    };
  };
  analysis: {
    tier1Processed: number;
    tier3Processed: number;
    promisesUpdated: number;
    totalCostUsd: number;
    errors: string[];
  };
  evidence: {
    extracted: number;
    new: number;
  };
  statusSync: {
    promisesChecked: number;
    statusesUpdated: number;
  };
  totalSignals: number;
  totalErrors: number;
}

export async function runFullSweep(
  options: {
    skipCollection?: boolean;
    skipAnalysis?: boolean;
    analysisBatchSize?: number;
    sweepType?: 'scheduled' | 'manual' | 'targeted';
    rssOnly?: boolean;
  } = {},
): Promise<SweepResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const {
    skipCollection = false,
    skipAnalysis = false,
    analysisBatchSize = 15,
    sweepType = 'manual',
    rssOnly = false,
  } = options;

  // Create sweep record
  const { data: sweep } = await supabase
    .from('intelligence_sweeps')
    .insert({
      sweep_type: sweepType,
      status: 'running',
    })
    .select('id')
    .single();

  const sweepId = sweep?.id || 'unknown';

  const result: SweepResult = {
    sweepId,
    status: 'completed',
    duration: 0,
    collection: {
      rss: { totalItems: 0, newItems: 0, errors: [] },
      youtube: {
        videosFound: 0,
        newVideos: 0,
        captionsExtracted: 0,
        errors: [],
      },
      search: {
        queriesRun: 0,
        resultsFound: 0,
        newSignals: 0,
        errors: [],
      },
      social: { postsFound: 0, newPosts: 0, errors: [] },
      apify: { profilesScraped: 0, totalPosts: 0, newPosts: 0, videosWithTranscript: 0, errors: [] },
      legacy: { articlesFound: 0, newArticles: 0, errors: [] },
    },
    analysis: {
      tier1Processed: 0,
      tier3Processed: 0,
      promisesUpdated: 0,
      totalCostUsd: 0,
      errors: [],
    },
    evidence: {
      extracted: 0,
      new: 0,
    },
    statusSync: {
      promisesChecked: 0,
      statusesUpdated: 0,
    },
    totalSignals: 0,
    totalErrors: 0,
  };

  try {
    // ===== COLLECTION PHASE =====
    if (!skipCollection) {
      console.log(`[Sweep] Starting collection phase...${rssOnly ? ' (RSS-only mode)' : ''}`);

      // RSS collection always runs
      try {
        result.collection.rss = await collectAllRSS();
      } catch (err) {
        result.collection.rss.errors.push(
          err instanceof Error ? err.message : 'RSS failed',
        );
      }

      // Skip non-RSS collectors in rss-only mode
      if (!rssOnly) {
        // Run YouTube
        try {
          result.collection.youtube = await collectAllYouTube();
        } catch (err) {
          result.collection.youtube.errors.push(
            err instanceof Error ? err.message : 'YouTube failed',
          );
        }

        // Run sequentially (rate-limited)
        try {
          result.collection.search = await collectAllWebSearch();
        } catch (err) {
          result.collection.search.errors.push(
            err instanceof Error ? err.message : 'Search failed',
          );
        }

        try {
          result.collection.social = await collectAllSocial();
        } catch (err) {
          result.collection.social.errors.push(
            err instanceof Error ? err.message : 'Social failed',
          );
        }

        // Run Apify Facebook profile scraper
        try {
          result.collection.apify = await collectAllApify();
        } catch (err) {
          result.collection.apify.errors.push(
            err instanceof Error ? err.message : 'Apify failed',
          );
        }

        // Run Government Portal scraper
        try {
          const govResult = await collectGovPortals();
          // Merge gov portal results into legacy bucket (press releases)
          result.collection.legacy.articlesFound += govResult.totalItems;
          result.collection.legacy.newArticles += govResult.newItems;
          result.collection.legacy.errors.push(...govResult.errors);
        } catch (err) {
          result.collection.legacy.errors.push(
            err instanceof Error ? err.message : 'Gov portal collection failed',
          );
        }
      }

      // Also run legacy scraper (existing 46 sources) — skip in rss-only mode
      if (!rssOnly) {
      try {
        const legacyRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scrape/bulk`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.SCRAPE_SECRET}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(300_000), // 5 min timeout
          },
        );

        if (legacyRes.ok) {
          const data = await legacyRes.json();
          result.collection.legacy = {
            articlesFound: data.totalFound || 0,
            newArticles: data.totalNew || 0,
            errors: [],
          };
        }
      } catch (err) {
        result.collection.legacy.errors.push(
          err instanceof Error ? err.message : 'Legacy scraper failed',
        );
      }
      } // end if (!rssOnly) for legacy
    }

    // ===== ANALYSIS PHASE =====
    if (!skipAnalysis) {
      console.log('[Sweep] Starting analysis phase...');

      // Process in batches
      let totalRounds = 0;
      const maxRounds = 10; // Safety limit

      while (totalRounds < maxRounds) {
        const batch = await processSignalsBatch(analysisBatchSize);

        result.analysis.tier1Processed += batch.tier1Processed;
        result.analysis.tier3Processed += batch.tier3Processed;
        result.analysis.promisesUpdated += batch.promisesUpdated;
        result.analysis.totalCostUsd += batch.totalCostUsd;
        result.analysis.errors.push(...batch.errors);

        // Stop if nothing left to process
        if (
          batch.tier1Processed === 0 &&
          batch.tier3Processed === 0
        )
          break;

        totalRounds++;
      }
    }

    // ===== EVIDENCE COLLECTION PHASE =====
    if (!skipAnalysis) {
      console.log('[Sweep] Starting evidence collection phase...');
      try {
        const evidenceResult = await collectSocialEvidence({
          minRelevance: 0.5,
          limit: 50,
        });
        result.evidence = {
          extracted: evidenceResult.signalsProcessed,
          new: evidenceResult.evidenceCreated,
        };
        if (evidenceResult.errors.length > 0) {
          result.analysis.errors.push(...evidenceResult.errors.map(e => `[Evidence] ${e}`));
        }
        console.log(`[Sweep] Evidence: ${evidenceResult.evidenceCreated} new entries from ${evidenceResult.signalsProcessed} signals`);
      } catch (err) {
        result.analysis.errors.push(
          `Evidence collection error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }

      // ===== STATUS SYNC PHASE =====
      console.log('[Sweep] Starting promise status sync...');
      try {
        const syncResult = await syncPromiseStatuses();
        result.statusSync = {
          promisesChecked: syncResult.promisesChecked,
          statusesUpdated: syncResult.statusesUpdated,
        };
        if (syncResult.errors.length > 0) {
          result.analysis.errors.push(...syncResult.errors.map(e => `[StatusSync] ${e}`));
        }
        console.log(`[Sweep] StatusSync: ${syncResult.statusesUpdated} statuses updated out of ${syncResult.promisesChecked} checked`);
      } catch (err) {
        result.analysis.errors.push(
          `Status sync error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // Calculate totals
    result.totalSignals =
      result.collection.rss.newItems +
      result.collection.youtube.newVideos +
      result.collection.search.newSignals +
      result.collection.social.newPosts +
      result.collection.apify.newPosts +
      result.collection.legacy.newArticles;

    result.totalErrors =
      result.collection.rss.errors.length +
      result.collection.youtube.errors.length +
      result.collection.search.errors.length +
      result.collection.social.errors.length +
      result.collection.apify.errors.length +
      result.collection.legacy.errors.length +
      result.analysis.errors.length;

    result.status = result.totalErrors > 10 ? 'partial' : 'completed';

    try {
      await upsertDailyQualityMetrics();
    } catch (err) {
      result.analysis.errors.push(
        `Quality metrics error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    // Daily activity rollup — "Was any work done today?" per promise
    try {
      const rollup = await computeDailyActivityRollup();
      console.log(`[Sweep] Daily rollup: ${rollup.promisesActive} active promises, ${rollup.totalSignals} signals`);
    } catch (err) {
      result.analysis.errors.push(
        `Daily rollup error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  } catch (err) {
    result.status = 'failed';
    result.analysis.errors.push(
      err instanceof Error ? err.message : 'Sweep failed',
    );
  }

  result.duration = Date.now() - startTime;

  // Update sweep record
  await supabase
    .from('intelligence_sweeps')
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      sources_checked:
        (result.collection.rss.totalItems > 0 ? 1 : 0) +
        (result.collection.youtube.videosFound > 0 ? 1 : 0) +
        (result.collection.search.queriesRun > 0 ? 1 : 0) +
        (result.collection.social.postsFound > 0 ? 1 : 0),
      signals_discovered: result.totalSignals,
      signals_relevant: result.analysis.tier3Processed,
      promises_updated: result.analysis.promisesUpdated,
      tier1_signals: result.analysis.tier1Processed,
      tier2_enriched: result.collection.youtube.captionsExtracted,
      tier3_analyzed: result.analysis.tier3Processed,
      ai_tokens_used: 0,
      ai_cost_usd: result.analysis.totalCostUsd,
      summary: `Sweep ${result.status}: ${result.totalSignals} new signals, ${result.analysis.promisesUpdated} promises updated, $${result.analysis.totalCostUsd.toFixed(4)} AI cost`,
    })
    .eq('id', sweepId);

  return result;
}
