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
import { processSignalsBatch } from './brain';
import { collectSocialEvidence } from './evidence/social-collector';
import { syncPromiseStatuses } from './promise-status-sync';

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
  } = {},
): Promise<SweepResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const {
    skipCollection = false,
    skipAnalysis = false,
    analysisBatchSize = 15,
    sweepType = 'manual',
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
      console.log('[Sweep] Starting collection phase...');

      // Run collectors in parallel where possible
      const [rssResult, youtubeResult] = await Promise.allSettled([
        collectAllRSS(),
        collectAllYouTube(),
      ]);

      if (rssResult.status === 'fulfilled') {
        result.collection.rss = rssResult.value;
      } else {
        result.collection.rss.errors.push(
          rssResult.reason?.message || 'RSS failed',
        );
      }

      if (youtubeResult.status === 'fulfilled') {
        result.collection.youtube = youtubeResult.value;
      } else {
        result.collection.youtube.errors.push(
          youtubeResult.reason?.message || 'YouTube failed',
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

      // Also run legacy scraper (existing 46 sources)
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
