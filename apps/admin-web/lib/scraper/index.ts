/**
 * Scraper orchestrator — runs individual source scrapers and logs results to Supabase.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ScrapedArticle, ScrapeResult, SourceScraper } from './types';

// Source scraper registry — import and register each source
import { kathmanduPostScraper } from './sources/kathmandu-post';
import { mofGovScraper } from './sources/mof-gov';
import { onlineKhabarScraper } from './sources/online-khabar';
import { republicaScraper } from './sources/republica';
import { himalayanTimesScraper } from './sources/himalayan-times';
import { nepaliTimesScraper } from './sources/nepali-times';
import { mopitGovScraper } from './sources/mopit-gov';
import { moudGovScraper } from './sources/moud-gov';
import { moewriGovScraper } from './sources/moewri-gov';
import { mohaGovScraper } from './sources/moha-gov';

/** All registered scrapers */
export const scrapers: Record<string, SourceScraper> = {
  'kathmandu-post': kathmanduPostScraper,
  'mof-gov': mofGovScraper,
  'online-khabar': onlineKhabarScraper,
  'republica': republicaScraper,
  'himalayan-times': himalayanTimesScraper,
  'nepali-times': nepaliTimesScraper,
  'mopit-gov': mopitGovScraper,
  'moud-gov': moudGovScraper,
  'moewri-gov': moewriGovScraper,
  'moha-gov': mohaGovScraper,
};

/**
 * Run a single source scraper and store results in Supabase.
 */
export async function scrapeSource(
  sourceName: string,
  triggerSource: 'github_actions' | 'vercel_cron' | 'manual' = 'manual'
): Promise<ScrapeResult> {
  const scraper = scrapers[sourceName];
  if (!scraper) {
    return {
      source: sourceName,
      success: false,
      articlesFound: 0,
      articlesNew: 0,
      durationMs: 0,
      error: `Unknown source: ${sourceName}. Available: ${Object.keys(scrapers).join(', ')}`,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      source: sourceName,
      success: false,
      articlesFound: 0,
      articlesNew: 0,
      durationMs: 0,
      error: 'Supabase not configured',
    };
  }

  const startTime = Date.now();

  try {
    // Run the scraper
    const articles = await scraper.scrape();
    const durationMs = Date.now() - startTime;

    if (articles.length === 0) {
      return {
        source: sourceName,
        success: true,
        articlesFound: 0,
        articlesNew: 0,
        durationMs,
      };
    }

    // Upsert articles — deduplicate by source_url
    const { data: upsertedData, error: upsertError } = await supabase
      .from('scraped_articles')
      .upsert(
        articles.map((a) => ({
          source_name: a.source_name,
          source_url: a.source_url,
          source_type: a.source_type,
          headline: a.headline,
          headline_ne: a.headline_ne || null,
          content_excerpt: a.content_excerpt,
          published_at: a.published_at,
          language: a.language,
          scraped_at: new Date().toISOString(),
          is_processed: false,
        })),
        { onConflict: 'source_url', ignoreDuplicates: true }
      )
      .select('id');

    if (upsertError) {
      throw new Error(`Supabase upsert error: ${upsertError.message}`);
    }

    const articlesNew = upsertedData?.length ?? 0;

    // Update data_sources health
    await supabase
      .from('data_sources')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        consecutive_failures: 0,
        avg_response_ms: durationMs,
      })
      .eq('slug', sourceName);

    return {
      source: sourceName,
      success: true,
      articlesFound: articles.length,
      articlesNew,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;

    // Increment failure counter
    try {
      await supabase.rpc('increment_source_failures', { source_slug: sourceName });
    } catch {
      // RPC might not exist yet — graceful fallback
      console.warn(`[scraper] Could not increment failures for ${sourceName}`);
    }

    return {
      source: sourceName,
      success: false,
      articlesFound: 0,
      articlesNew: 0,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Create a scrape_run record and return its ID.
 */
export async function createScrapeRun(
  triggerSource: 'github_actions' | 'vercel_cron' | 'manual'
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('scrape_runs')
    .insert({
      run_type: triggerSource === 'manual' ? 'manual' : 'scheduled',
      trigger_source: triggerSource,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[scraper] Failed to create scrape run:', error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Finalize a scrape_run record with results.
 */
export async function finalizeScrapeRun(
  runId: string,
  results: ScrapeResult[]
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const succeeded = results.filter((r) => r.success).length;
  const status = succeeded === results.length ? 'completed' : succeeded > 0 ? 'partial' : 'failed';

  await supabase
    .from('scrape_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      sources_attempted: results.length,
      sources_succeeded: succeeded,
      articles_found: results.reduce((sum, r) => sum + r.articlesFound, 0),
      articles_new: results.reduce((sum, r) => sum + r.articlesNew, 0),
      error_log: results
        .filter((r) => !r.success)
        .map((r) => ({
          source: r.source,
          error: r.error || 'Unknown error',
          timestamp: new Date().toISOString(),
        })),
    })
    .eq('id', runId);
}
