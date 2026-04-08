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
import { enrichUnprocessedSignals } from './collectors/article-fetcher';
import { extractAndStoreEntities } from './entity-extractor';
import { processSignalsBatch } from './brain';
import { translatePendingNepaliSignals } from './translate';
import { collectSocialEvidence } from './evidence/social-collector';
import { syncPromiseStatuses } from './promise-status-sync';
import { computeDailyActivityRollup } from './daily-activity-rollup';
import { deduplicateSignals } from './dedup';
import { scrapeFacebookPages } from './collectors/facebook-scraper';
import { scrapeTikTok } from './collectors/tiktok-scraper';
import { scrapeReddit } from './collectors/reddit-scraper';
import { scrapeTelegram } from './collectors/telegram-scraper';
import { scrapeThreads } from './collectors/threads-scraper';
import { scrapeParliamentAndGazette } from './collectors/parliament-scraper';
import { scrapeX } from './collectors/x-scraper';
import { scrapeGoogleTrends } from './collectors/google-trends';
import { refreshTrendingSnapshot } from './trending';
import { computeTruthScoreBatch } from './truth-meter';
import {
  ensureSignalAnalysisJobsQueued,
  enqueueDiscoveryJobsForSignals,
  enqueueStatusPipelineJob,
  processIntelligenceJobs,
} from './jobs';

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

async function cleanupStaleSweeps(maxAgeMinutes = 25): Promise<number> {
  const supabase = getSupabase();
  const cutoffIso = new Date(
    Date.now() - maxAgeMinutes * 60_000,
  ).toISOString();

  const { data: staleSweeps, error } = await supabase
    .from('intelligence_sweeps')
    .select('id, started_at')
    .eq('status', 'running')
    .lt('started_at', cutoffIso);

  if (error || !staleSweeps || staleSweeps.length === 0) {
    return 0;
  }

  const staleIds = staleSweeps.map((row) => row.id);
  const { error: updateError } = await supabase
    .from('intelligence_sweeps')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      summary: 'Sweep marked failed after exceeding stale runtime threshold.',
    })
    .in('id', staleIds);

  if (updateError) {
    console.warn('[Sweep] Failed to mark stale sweeps:', updateError.message);
    return 0;
  }

  return staleIds.length;
}

async function markDiscoveryOnlySignalsProcessed(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('id, matched_promise_ids')
    .eq('tier1_processed', true)
    .eq('tier3_processed', false)
    .gte('relevance_score', 0.3)
    .limit(500);

  if (error || !data) {
    return 0;
  }

  const ids = data
    .filter((row) => Array.isArray(row.matched_promise_ids) && row.matched_promise_ids.length === 0)
    .map((row) => row.id as string);

  if (ids.length === 0) {
    return 0;
  }

  const { error: updateError } = await supabase
    .from('intelligence_signals')
    .update({
      tier3_processed: true,
      review_required: true,
      review_status: 'pending',
      review_notes: 'Skipped Tier 3 because the signal is relevant but currently unmatched; routed to discovery/review instead.',
    })
    .in('id', ids);

  if (updateError) {
    console.warn('[Sweep] Failed to mark discovery-only signals:', updateError.message);
    return 0;
  }

  return ids.length;
}

async function getAnalysisBacklog(): Promise<{
  unclassified: number;
  tier3Pending: number;
  total: number;
}> {
  const supabase = getSupabase();

  const { count: unclassifiedCount } = await supabase
    .from('intelligence_signals')
    .select('id', { count: 'exact', head: true })
    .eq('tier1_processed', false);

  const { data: tier3Candidates } = await supabase
    .from('intelligence_signals')
    .select('matched_promise_ids')
    .eq('tier1_processed', true)
    .eq('tier3_processed', false)
    .gte('relevance_score', 0.3)
    .limit(1000);

  const tier3Pending = (tier3Candidates || []).filter(
    (row) => Array.isArray(row.matched_promise_ids) && row.matched_promise_ids.length > 0,
  ).length;

  return {
    unclassified: unclassifiedCount || 0,
    tier3Pending,
    total: (unclassifiedCount || 0) + tier3Pending,
  };
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
      groqTranscriptions: number;
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
    tiktok: { videosFound: number; newVideos: number; errors: string[] };
    reddit: { postsFound: number; newPosts: number; errors: string[] };
    telegram: { messagesFound: number; newMessages: number; errors: string[] };
    threads: { postsFound: number; newPosts: number; errors: string[] };
    parliament: { documentsFound: number; newDocuments: number; errors: string[] };
    x: { postsFound: number; newPosts: number; errors: string[] };
    googleTrends: { trendsFound: number; newTrends: number; errors: string[] };
  };
  trending: {
    pulseScore: number;
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
  const sweepStartedAtIso = new Date().toISOString();
  const autoSyncPromiseStatuses =
    process.env.INTELLIGENCE_AUTO_STATUS_SYNC === 'true' &&
    process.env.INTELLIGENCE_ALLOW_DIRECT_STATUS_WRITES === 'true';
  const inlineStatusWorker =
    process.env.INTELLIGENCE_INLINE_STATUS_WORKER === 'true';
  const inlineAnalysisWorker =
    sweepType !== 'scheduled' &&
    process.env.INTELLIGENCE_INLINE_ANALYSIS_WORKER !== 'false';
  const scheduledFastMode =
    sweepType === 'scheduled' &&
    process.env.INTELLIGENCE_SCHEDULED_FAST_MODE !== 'false';
  const enableLegacyScraper =
    process.env.INTELLIGENCE_ENABLE_LEGACY_SWEEP === 'true';
  const enableHeavyScheduledCollectors =
    process.env.INTELLIGENCE_ENABLE_HEAVY_SCHEDULED_COLLECTORS === 'true';
  const staleSweepMinutes = Math.max(
    15,
    Number.parseInt(process.env.INTELLIGENCE_STALE_SWEEP_MINUTES || '25', 10) ||
      25,
  );

  const staleSweepsClosed = await cleanupStaleSweeps(staleSweepMinutes);
  if (staleSweepsClosed > 0) {
    console.warn(`[Sweep] Closed ${staleSweepsClosed} stale sweep record(s) before starting a new run.`);
  }

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
        groqTranscriptions: 0,
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
      tiktok: { videosFound: 0, newVideos: 0, errors: [] },
      reddit: { postsFound: 0, newPosts: 0, errors: [] },
      telegram: { messagesFound: 0, newMessages: 0, errors: [] },
      threads: { postsFound: 0, newPosts: 0, errors: [] },
      parliament: { documentsFound: 0, newDocuments: 0, errors: [] },
      x: { postsFound: 0, newPosts: 0, errors: [] },
      googleTrends: { trendsFound: 0, newTrends: 0, errors: [] },
    },
    trending: {
      pulseScore: 0,
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
    let analysisQueued = false;

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

        const runHeavyCollectors =
          !scheduledFastMode || enableHeavyScheduledCollectors;

        if (runHeavyCollectors) {
          // Run sequentially (rate-limited)
          try {
            result.collection.search = await collectAllWebSearch();
          } catch (err) {
            result.collection.search.errors.push(
              err instanceof Error ? err.message : 'Search failed',
            );
          }
        } else {
          console.log(
            '[Sweep] Skipping web search in scheduled fast mode (set INTELLIGENCE_ENABLE_HEAVY_SCHEDULED_COLLECTORS=true to enable).',
          );
        }

        try {
          result.collection.social = await collectAllSocial();
        } catch (err) {
          result.collection.social.errors.push(
            err instanceof Error ? err.message : 'Social failed',
          );
        }

        if (runHeavyCollectors) {
          // Run Apify Facebook profile scraper
          try {
            result.collection.apify = await collectAllApify();
          } catch (err) {
            result.collection.apify.errors.push(
              err instanceof Error ? err.message : 'Apify failed',
            );
          }

          // Run Facebook page scraper (Apify or DuckDuckGo fallback)
          try {
            const fbResult = await scrapeFacebookPages();
            result.collection.social.postsFound += fbResult.postsFound;
            result.collection.social.newPosts += fbResult.newPosts;
            if (fbResult.errors.length > 0) {
              result.collection.social.errors.push(...fbResult.errors.map(e => `[Facebook] ${e}`));
            }
            console.log(`[Sweep] Facebook: ${fbResult.newPosts} new posts from ${fbResult.postsFound} found`);
          } catch (err) {
            result.collection.social.errors.push(
              `Facebook scraper: ${err instanceof Error ? err.message : 'error'}`,
            );
          }
        } else {
          console.log(
            '[Sweep] Skipping Apify/Facebook page scrapers in scheduled fast mode.',
          );
        }

        // Run X (Twitter) scraper
        try {
          const xResult = await scrapeX();
          result.collection.x = {
            postsFound: xResult.tweetsFound,
            newPosts: xResult.newTweets,
            errors: xResult.errors,
          };
          console.log(
            `[Sweep] X: ${xResult.newTweets} new posts from ${xResult.tweetsFound} found`,
          );
        } catch (err) {
          result.collection.x.errors.push(
            `X scraper: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Run Threads scraper
        try {
          const threadsResult = await scrapeThreads();
          result.collection.threads = threadsResult;
          console.log(`[Sweep] Threads: ${threadsResult.newPosts} new posts from ${threadsResult.postsFound} found`);
        } catch (err) {
          result.collection.threads.errors.push(
            `Threads scraper: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Run TikTok scraper
        try {
          const tiktokResult = await scrapeTikTok();
          result.collection.tiktok = tiktokResult;
          console.log(`[Sweep] TikTok: ${tiktokResult.newVideos} new videos from ${tiktokResult.videosFound} found`);
        } catch (err) {
          result.collection.tiktok.errors.push(
            `TikTok scraper: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Run Reddit scraper
        try {
          const redditResult = await scrapeReddit();
          result.collection.reddit = redditResult;
          console.log(`[Sweep] Reddit: ${redditResult.newPosts} new posts from ${redditResult.postsFound} found`);
        } catch (err) {
          result.collection.reddit.errors.push(
            `Reddit scraper: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Run Telegram scraper
        try {
          const telegramResult = await scrapeTelegram();
          result.collection.telegram = telegramResult;
          console.log(`[Sweep] Telegram: ${telegramResult.newMessages} new messages from ${telegramResult.messagesFound} found`);
        } catch (err) {
          result.collection.telegram.errors.push(
            `Telegram scraper: ${err instanceof Error ? err.message : 'error'}`,
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

        // Run Parliament & Gazette scraper
        try {
          const parliamentResult = await scrapeParliamentAndGazette();
          result.collection.parliament = parliamentResult;
          console.log(`[Sweep] Parliament: ${parliamentResult.newDocuments} new documents from ${parliamentResult.documentsFound} found`);
        } catch (err) {
          result.collection.parliament.errors.push(
            `Parliament scraper: ${err instanceof Error ? err.message : 'error'}`,
          );
        }

        // Run Google Trends (last — metadata about what's trending)
        try {
          const trendsResult = await scrapeGoogleTrends();
          result.collection.googleTrends = trendsResult;
          console.log(`[Sweep] Google Trends: ${trendsResult.newTrends} new trends from ${trendsResult.trendsFound} found`);
        } catch (err) {
          result.collection.googleTrends.errors.push(
            `Google Trends: ${err instanceof Error ? err.message : 'error'}`,
          );
        }
      }

      // Also run legacy scraper (existing 46 sources) — opt-in only
      if (!rssOnly && enableLegacyScraper) {
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
      } // end legacy scraper block
    }

    // ===== ENRICHMENT PHASE =====
    // Fetch full article content and extract entities before analysis
    if (!skipCollection) {
      console.log('[Sweep] Starting enrichment phase...');
      try {
        const enrichResult = await enrichUnprocessedSignals(100);
        console.log(
          `[Sweep] Enriched ${enrichResult.enriched} signals, ` +
            `${enrichResult.failed} failed, ${enrichResult.skipped} skipped`,
        );

        // Extract entities from recently enriched signals
        const { data: enrichedSignals } = await supabase
          .from('intelligence_signals')
          .select('id, content')
          .eq('signal_type', 'article')
          .not('content', 'is', null)
          .is('extracted_data', null)
          .order('discovered_at', { ascending: false })
          .limit(200);

        let entitiesExtracted = 0;
        if (enrichedSignals) {
          for (const signal of enrichedSignals) {
            if (signal.content && signal.content.length > 50) {
              try {
                await extractAndStoreEntities(signal.id, signal.content);
                entitiesExtracted++;
              } catch {
                // Non-fatal — continue with other signals
              }
            }
          }
        }

        console.log(
          `[Sweep] Enriched ${enrichResult.enriched} signals, extracted entities from ${entitiesExtracted}`,
        );
      } catch (err) {
        result.analysis.errors.push(
          `Enrichment error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== DEDUPLICATION PHASE (before analysis to avoid wasting AI on dupes) =====
    if (!skipAnalysis) {
      console.log('[Sweep] Starting deduplication phase...');
      try {
        const dedupResult = await deduplicateSignals();
        console.log(`[Sweep] Dedup: ${dedupResult.merged} duplicates merged, ${dedupResult.canonical} canonical groups`);
      } catch (err) {
        result.analysis.errors.push(
          `Dedup error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== ANALYSIS PHASE =====
    if (!skipAnalysis) {
      const discoveryOnlySignals = await markDiscoveryOnlySignalsProcessed();
      if (discoveryOnlySignals > 0) {
        console.log(
          `[Sweep] Marked ${discoveryOnlySignals} relevant unmatched signals as discovery-only.`,
        );
      }

      const backlog = await getAnalysisBacklog();
      if (backlog.total === 0) {
        console.log('[Sweep] No signal-analysis backlog found.');
      } else if (!inlineAnalysisWorker) {
        const queuedBatchSize = Math.min(5, analysisBatchSize);
        const queueState = await ensureSignalAnalysisJobsQueued({
          batchSize: queuedBatchSize,
          maxJobs: 8,
          trigger: `${sweepType}-${sweepId.slice(0, 8)}`,
        });
        analysisQueued =
          queueState.queued > 0 || queueState.existingPendingOrRunning > 0;
        if (queueState.queued > 0) {
          console.log(
            `[Sweep] Queued ${queueState.queued} analysis jobs for ${queueState.backlog.total} pending signals ` +
              `(${queueState.backlog.unclassified} Tier 1, ${queueState.backlog.tier3Pending} Tier 3).`,
          );
        } else if (queueState.existingPendingOrRunning > 0) {
          console.log(
            `[Sweep] Reusing ${queueState.existingPendingOrRunning} existing pending/running analysis jobs ` +
              `for backlog ${queueState.backlog.total}.`,
          );
        }
      } else {
        console.log(
          `[Sweep] Starting inline analysis for ${backlog.total} pending signals ` +
            `(${backlog.unclassified} Tier 1, ${backlog.tier3Pending} Tier 3).`,
        );

        let totalRounds = 0;
        const maxRounds = 4;

        while (totalRounds < maxRounds) {
          const batch = await processSignalsBatch(analysisBatchSize);

          result.analysis.tier1Processed += batch.tier1Processed;
          result.analysis.tier3Processed += batch.tier3Processed;
          result.analysis.promisesUpdated += batch.promisesUpdated;
          result.analysis.totalCostUsd += batch.totalCostUsd;
          result.analysis.errors.push(...batch.errors);

          if (batch.tier1Processed === 0 && batch.tier3Processed === 0) {
            break;
          }

          totalRounds++;
        }
      }

      // ===== TRANSLATION PHASE =====
      // Translate Nepali signals that were classified as relevant
      if (!analysisQueued) {
        try {
          console.log('[Sweep] Starting Nepali signal translation...');
          const translationResult = await translatePendingNepaliSignals(20);
          if (translationResult.scanned > 0) {
            console.log(
              `[Sweep] Translation backlog: ${translationResult.translated} translated, ` +
                `${translationResult.failed} failed (scanned ${translationResult.scanned})`,
            );
          }
        } catch (err) {
          result.analysis.errors.push(
            `Translation error: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      } else {
        console.log('[Sweep] Skipping inline translation because analysis is queued for the worker.');
      }
    }

    // ===== EVIDENCE COLLECTION PHASE =====
    if (!skipAnalysis && !analysisQueued) {
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
      if (autoSyncPromiseStatuses) {
        console.log('[Sweep] Starting promise status sync...');
        try {
          const syncResult = await syncPromiseStatuses({
            applyStatusChanges: true,
          });
          result.statusSync = {
            promisesChecked: syncResult.promisesChecked,
            statusesUpdated: syncResult.statusesUpdated,
          };
          if (syncResult.errors.length > 0) {
            result.analysis.errors.push(...syncResult.errors.map(e => `[StatusSync] ${e}`));
          }
          console.log(
            `[Sweep] StatusSync: ${syncResult.statusesUpdated} statuses updated ` +
            `out of ${syncResult.promisesChecked} checked (status writes enabled)`,
          );
        } catch (err) {
          result.analysis.errors.push(
            `Status sync error: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      } else {
        console.log(
          '[Sweep] Skipping direct status sync (review-safe mode). Enable INTELLIGENCE_ALLOW_DIRECT_STATUS_WRITES=true only if intentional.',
        );
      }
    }

    // ===== TRUTH SCORING PHASE =====
    if (!skipAnalysis && !analysisQueued) {
      console.log('[Sweep] Computing truth scores for newly classified signals...');
      try {
        const { data: scorableSignals } = await supabase
          .from('intelligence_signals')
          .select('id')
          .eq('tier1_processed', true)
          .gte('relevance_score', 0.3)
          .or('metadata.is.null,metadata->>truth_score.is.null')
          .order('discovered_at', { ascending: false })
          .limit(30);

        if (scorableSignals && scorableSignals.length > 0) {
          const ids = scorableSignals.map((s) => s.id as string);
          const scores = await computeTruthScoreBatch(ids);

          let truthScored = 0;
          for (const [signalId, truthScore] of scores) {
            const { data: existing } = await supabase
              .from('intelligence_signals')
              .select('metadata')
              .eq('id', signalId)
              .single();

            const existingMeta =
              typeof existing?.metadata === 'object' && existing?.metadata !== null
                ? existing.metadata
                : {};

            await supabase
              .from('intelligence_signals')
              .update({
                metadata: {
                  ...(existingMeta as Record<string, unknown>),
                  truth_score: truthScore.score,
                  truth_label: truthScore.label,
                  truth_factors: truthScore.factors,
                },
              })
              .eq('id', signalId);

            truthScored++;
          }

          console.log(`[Sweep] Truth scoring: scored ${truthScored} signals`);
        } else {
          console.log('[Sweep] Truth scoring: no new signals to score');
        }
      } catch (err) {
        result.analysis.errors.push(
          `Truth scoring error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }

      // ===== STATUS PIPELINE PHASE =====
      console.log('[Sweep] Queueing status pipeline job...');
      try {
        const job = await enqueueStatusPipelineJob(sweepType);
        console.log(`[Sweep] Status pipeline job queued: ${job.id}`);

        if (inlineStatusWorker) {
          const workerResult = await processIntelligenceJobs({
            limit: 1,
            workerId: 'sweep-inline-status',
            jobTypes: ['run_status_pipeline'],
          });
          console.log(
            `[Sweep] Inline status worker: ${workerResult.completed} completed, ` +
              `${workerResult.requeued} requeued, ${workerResult.failed} failed`,
          );
        }
      } catch (err) {
        result.analysis.errors.push(
          `Status pipeline error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }
    if (!skipAnalysis && analysisQueued) {
      console.log('[Sweep] Queueing status pipeline job after queued analysis batches...');
      try {
        const job = await enqueueStatusPipelineJob(`${sweepType}-queued-analysis`);
        console.log(`[Sweep] Status pipeline job queued: ${job.id}`);
      } catch (err) {
        result.analysis.errors.push(
          `Status pipeline error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== COMMITMENT DISCOVERY PHASE =====
    if (!skipAnalysis && !analysisQueued && !rssOnly) {
      console.log('[Sweep] Queueing commitment discovery jobs...');
      try {
        // Get recently classified signals that haven't been scanned for discoveries
        const { data: recentSignals } = await supabase
          .from('intelligence_signals')
          .select('id, source_id, signal_type, title, content, url, published_at, author, media_type, metadata')
          .eq('tier1_processed', true)
          .gte('relevance_score', 0.3)
          .or('metadata.is.null,metadata->>potential_new_commitment.is.null')
          .order('discovered_at', { ascending: false })
          .limit(30);

        if (recentSignals && recentSignals.length > 0) {
          const jobs = await enqueueDiscoveryJobsForSignals(recentSignals);
          console.log(`[Sweep] Commitment discovery: queued ${jobs.length} discovery jobs`);

          if (process.env.INTELLIGENCE_INLINE_DISCOVERY_WORKER === 'true') {
            const workerResult = await processIntelligenceJobs({
              limit: jobs.length,
              workerId: 'sweep-inline-discovery',
              jobTypes: ['discover_commitment'],
            });
            console.log(
              `[Sweep] Inline discovery worker: ${workerResult.completed} completed, ` +
                `${workerResult.requeued} requeued, ${workerResult.failed} failed`,
            );
          }
        }
      } catch (err) {
        result.analysis.errors.push(
          `Commitment discovery error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== GOVERNMENT ROSTER EXTRACTION PHASE =====
    if (!skipAnalysis && !rssOnly && !analysisQueued) {
      console.log('[Sweep] Extracting government roster updates...');
      try {
        const { extractGovernmentRoster } = await import('./government-roster');
        const rosterResult = await extractGovernmentRoster(sweepStartedAtIso);
        console.log(
          `[Sweep] Roster: scanned ${rosterResult.signalsScanned}, found ${rosterResult.appointmentSignals} appointment signals, ` +
            `extracted ${rosterResult.appointmentsExtracted}, upserted ${rosterResult.officialsUpserted}`,
        );
        if (rosterResult.errors.length > 0) {
          result.analysis.errors.push(...rosterResult.errors.slice(0, 5));
        }
      } catch (err) {
        result.analysis.errors.push(
          `Roster extraction error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== CONSTITUTION AMENDMENT TRACKING PHASE =====
    if (!skipAnalysis && !rssOnly && !analysisQueued) {
      console.log('[Sweep] Tracking constitution amendment signals...');
      try {
        const { trackConstitutionAmendments } = await import('./constitution-tracker');
        const constResult = await trackConstitutionAmendments(sweepStartedAtIso);
        console.log(
          `[Sweep] Constitution: scanned ${constResult.signalsScanned}, found ${constResult.amendmentSignals} amendment signals, ` +
            `detected ${constResult.amendmentsDetected} amendments, updated ${constResult.articlesUpdated} articles`,
        );
        if (constResult.errors.length > 0) {
          result.analysis.errors.push(...constResult.errors.slice(0, 5));
        }
      } catch (err) {
        result.analysis.errors.push(
          `Constitution tracking error: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      }
    }

    // ===== TRENDING COMPUTATION PHASE =====
    // Keep the public pulse fast by refreshing the persisted trending snapshot
    // during sweeps, even when AI analysis is queued for workers.
    console.log('[Sweep] Refreshing trending snapshot...');
    try {
      const snapshot = await refreshTrendingSnapshot({ force: true });
      const pulseScore = snapshot?.pulse || 0;
      result.trending.pulseScore = pulseScore;
      console.log(`[Sweep] Trending pulse score: ${pulseScore}`);
    } catch (err) {
      result.analysis.errors.push(
        `Trending computation error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    // ===== DAILY BRIEF REGENERATION PHASE =====
    // Brief + audio generation is now a SEPARATE cron (/api/daily-brief?generate=1)
    // that runs 30 min after the sweep (at :45), so it uses freshly collected signals
    // without competing for the sweep's 300s timeout.
    // Manual sweeps (sweepType === 'manual') still generate inline for convenience.
    if (!rssOnly && sweepType === 'manual') {
      console.log('[Sweep] Regenerating daily brief (manual sweep)...');
      try {
        const { generateDailyBrief } = await import('./daily-brief');

        const todayBrief = await generateDailyBrief();
        console.log('[Sweep] Daily brief regenerated');

        try {
          const { generateAndStoreDailyAudio } = await import('./brief-narrator');
          const audioResult = await generateAndStoreDailyAudio(todayBrief);
          if (audioResult.audioUrl) {
            console.log(`[Sweep] Brief audio generated via ${audioResult.provider} (${audioResult.durationSeconds}s)`);
          } else {
            console.log(`[Sweep] Brief audio skipped: ${audioResult.error || 'no TTS provider'}`);
          }
        } catch (audioErr) {
          console.warn('[Sweep] Brief audio error:', audioErr instanceof Error ? audioErr.message : 'unknown');
        }
      } catch (err) {
        console.warn('[Sweep] Daily brief error:', err instanceof Error ? err.message : 'unknown');
      }
    } else if (!rssOnly) {
      console.log('[Sweep] Skipping brief generation — handled by separate /api/daily-brief?generate=1 cron at :45');
    }

    // Calculate totals
    result.totalSignals =
      result.collection.rss.newItems +
      result.collection.youtube.newVideos +
      result.collection.search.newSignals +
      result.collection.social.newPosts +
      result.collection.apify.newPosts +
      result.collection.legacy.newArticles +
      result.collection.tiktok.newVideos +
      result.collection.reddit.newPosts +
      result.collection.telegram.newMessages +
      result.collection.threads.newPosts +
      result.collection.parliament.newDocuments +
      result.collection.x.newPosts +
      result.collection.googleTrends.newTrends;

    result.totalErrors =
      result.collection.rss.errors.length +
      result.collection.youtube.errors.length +
      result.collection.search.errors.length +
      result.collection.social.errors.length +
      result.collection.apify.errors.length +
      result.collection.legacy.errors.length +
      result.collection.tiktok.errors.length +
      result.collection.reddit.errors.length +
      result.collection.telegram.errors.length +
      result.collection.threads.errors.length +
      result.collection.parliament.errors.length +
      result.collection.x.errors.length +
      result.collection.googleTrends.errors.length +
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

    // ===== COMBINED SCORING — merge AI + community signals into final progress =====
    try {
      const { computeAllCombinedScores } = await import('./combined-scoring');
      const scores = await computeAllCombinedScores();
      console.log(`[Sweep] Combined scoring: computed ${scores.length} scores`);
    } catch (err) {
      result.analysis.errors.push(
        `Combined scoring error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    // ===== TIME-ADJUSTED GOVERNMENT SCORE =====
    try {
      const { recomputeDailyGovernmentScore } = await import('./time-adjusted-score');
      const govScore = await recomputeDailyGovernmentScore();
      console.log(
        `[Sweep] Time-adjusted score: ${govScore.score}/100 (${govScore.grade}) — ` +
        `ahead=${govScore.aheadCount} onTrack=${govScore.onTrackCount} behind=${govScore.behindCount}`,
      );
    } catch (err) {
      result.analysis.errors.push(
        `Time-adjusted scoring error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  } catch (err) {
    result.status = 'failed';
    result.analysis.errors.push(
      err instanceof Error ? err.message : 'Sweep failed',
    );
  }

  // ── Pre-warm briefings — regenerate for ALL commitments that got new signals (no cap) ──
  try {
    const { generateBriefingBatch } = await import('./commitment-briefing');
    const { generateImpactBatch } = await import('./impact-predictor');
    // Find commitments that got new signals in this sweep
    const { data: updatedCommitments } = await supabase
      .from('intelligence_signals')
      .select('matched_promise_ids')
      .gte('discovered_at', sweepStartedAtIso)
      .not('matched_promise_ids', 'eq', '{}');

    const affectedIds = new Set<number>();
    for (const sig of updatedCommitments || []) {
      const ids = (sig.matched_promise_ids as number[]) || [];
      for (const id of ids) affectedIds.add(id);
    }

    if (affectedIds.size > 0) {
      const idsToWarm = Array.from(affectedIds); // No cap — warm all affected
      const warmResult = await generateBriefingBatch(idsToWarm);
      console.log(
        `[Sweep] Pre-warmed ${warmResult.generated} briefings (${warmResult.failed} failed) for ${idsToWarm.length} commitments`,
      );
      // Also refresh impact predictions for affected commitments
      const impactResult = await generateImpactBatch(idsToWarm);
      console.log(
        `[Sweep] Pre-warmed ${impactResult.generated} impact predictions for ${idsToWarm.length} commitments`,
      );
    }
  } catch (err) {
    result.analysis.errors.push(
      `Briefing pre-warm error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  // ── Source Discovery — suggest new sources based on what we just scraped ──
  let sourceDiscoveryResult: { suggestionsCreated: number; autoApproved: number } | undefined;
  try {
    const { discoverNewSources } = await import('./source-discovery');
    sourceDiscoveryResult = await discoverNewSources({ dayWindow: 3, minReferences: 3, maxSuggestions: 5 });
  } catch (err) {
    result.analysis.errors.push(
      `Source discovery error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  result.duration = Date.now() - startTime;

  const { count: relevantSignalsSinceSweep } = await supabase
    .from('intelligence_signals')
    .select('id', { count: 'exact', head: true })
    .gte('discovered_at', sweepStartedAtIso)
    .gte('relevance_score', 0.3);

  // Update sweep record
  // Per-collector breakdown so silent failures become visible
  const collectorBreakdown: Record<string, number> = {
    rss: result.collection.rss.totalItems || 0,
    youtube: result.collection.youtube.videosFound || 0,
    search: result.collection.search.queriesRun || 0,
    social: result.collection.social.postsFound || 0,
    apify: (result.collection.apify as { profilesProcessed?: number })?.profilesProcessed || 0,
    facebook_pages: result.collection.social.newPosts || 0,
    x: result.collection.x?.newPosts || 0,
    threads: result.collection.threads?.newPosts || 0,
    tiktok: (result.collection.tiktok as { newVideos?: number })?.newVideos || 0,
    reddit: result.collection.reddit?.newPosts || 0,
    telegram: (result.collection.telegram as { newMessages?: number })?.newMessages || 0,
    parliament: (result.collection.parliament as { newDocuments?: number })?.newDocuments || 0,
    google_trends: (result.collection.googleTrends as { newTrends?: number })?.newTrends || 0,
    legacy: result.collection.legacy.newArticles || 0,
  };
  const collectorErrors: Record<string, string[]> = {
    rss: result.collection.rss.errors || [],
    youtube: result.collection.youtube.errors || [],
    search: result.collection.search.errors || [],
    social: result.collection.social.errors || [],
    x: result.collection.x?.errors || [],
    threads: result.collection.threads?.errors || [],
    tiktok: (result.collection.tiktok as { errors?: string[] })?.errors || [],
    reddit: result.collection.reddit?.errors || [],
    telegram: (result.collection.telegram as { errors?: string[] })?.errors || [],
    parliament: (result.collection.parliament as { errors?: string[] })?.errors || [],
    googleTrends: (result.collection.googleTrends as { errors?: string[] })?.errors || [],
    legacy: result.collection.legacy.errors || [],
  };
  const sourcesActive = Object.values(collectorBreakdown).filter((n) => n > 0).length;

  await supabase
    .from('intelligence_sweeps')
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      sources_checked: sourcesActive,
      signals_discovered: result.totalSignals,
      signals_relevant: relevantSignalsSinceSweep || 0,
      promises_updated: result.analysis.promisesUpdated,
      tier1_signals: result.analysis.tier1Processed,
      tier2_enriched: result.collection.youtube.captionsExtracted + result.collection.youtube.groqTranscriptions,
      tier3_analyzed: result.analysis.tier3Processed,
      ai_tokens_used: 0,
      ai_cost_usd: result.analysis.totalCostUsd,
      error_log: Object.entries(collectorErrors).flatMap(([k, errs]) => errs.slice(0, 3).map((e) => `[${k}] ${e}`)).slice(0, 50),
      summary: {
        text:
          result.analysis.tier1Processed === 0 &&
          result.analysis.tier3Processed === 0 &&
          !skipAnalysis
            ? `Sweep ${result.status}: ${result.totalSignals} new signals, downstream analysis queued for the worker.`
            : `Sweep ${result.status}: ${result.totalSignals} new signals, ${result.analysis.promisesUpdated} promises updated, $${result.analysis.totalCostUsd.toFixed(4)} AI cost`,
        collectors: collectorBreakdown,
        sources_active: sourcesActive,
      },
    })
    .eq('id', sweepId);

  return result;
}
