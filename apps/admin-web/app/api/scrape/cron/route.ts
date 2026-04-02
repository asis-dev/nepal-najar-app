/**
 * GET /api/scrape/cron
 * Vercel Cron endpoint — scrapes all active sources sequentially.
 *
 * Protected by CRON_SECRET header (Vercel cron jobs) or Bearer SCRAPE_SECRET.
 *
 * Schedule: every 6 hours (configured in vercel.json)
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth } from '@/lib/scraper/auth';
import { scrapers } from '@/lib/scraper';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { matchArticleToPromises } from '@/lib/scraper/matcher';
import { buildGovernmentStructureSnapshot } from '@/lib/org-structure/engine';
import { recomputeAllPromises } from '@/lib/scraper/promise-recomputer';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

export const maxDuration = 300; // 5 min for full scrape cycle

export async function GET(request: Request) {
  // Verify auth — either Vercel CRON_SECRET or Bearer token
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = bearerMatchesSecret(request, cronSecret);
  const isScrapeAuth = await validateScrapeAuth(request);

  if (!isCronAuth && !isScrapeAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const scraperEntries = Object.entries(scrapers);
  const results: Array<{
    source: string;
    success: boolean;
    articlesFound: number;
    articlesNew: number;
    error?: string;
  }> = [];

  // Create scrape run record
  const { data: run } = await supabase
    .from('scrape_runs')
    .insert({
      run_type: 'scheduled',
      trigger_source: isCronAuth ? 'vercel_cron' : 'manual',
      status: 'running',
      started_at: new Date().toISOString(),
      sources_attempted: scraperEntries.length,
    })
    .select('id')
    .single();

  const runId = run?.id;

  // Scrape each source sequentially
  for (const [slug, scraper] of scraperEntries) {
    try {
      const articles = await scraper.scrape();
      let newCount = 0;

      for (const article of articles) {
        // Match to promises using headline + excerpt
        const match = matchArticleToPromises({
          headline: article.headline,
          headline_ne: article.headline_ne,
          content_excerpt: article.content_excerpt,
        });

        // Upsert to scraped_articles (deduplicate by source_url)
        const { error } = await supabase
          .from('scraped_articles')
          .upsert(
            {
              source_name: article.source_name,
              source_url: article.source_url,
              source_type: article.source_type,
              headline: article.headline,
              headline_ne: article.headline_ne || null,
              content_excerpt: article.content_excerpt || null,
              published_at: article.published_at || null,
              scraped_at: new Date().toISOString(),
              language: article.language,
              promise_ids: match.promiseIds,
              confidence: match.confidence,
              classification: match.classification,
              is_processed: match.promiseIds.length > 0,
            },
            { onConflict: 'source_url' },
          );

        if (!error) newCount++;
      }

      // Update data source health
      await supabase
        .from('data_sources')
        .update({
          last_scraped_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          consecutive_failures: 0,
        })
        .eq('slug', slug);

      results.push({
        source: scraper.name,
        success: true,
        articlesFound: articles.length,
        articlesNew: newCount,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Increment failure count
      await supabase.rpc('increment_source_failures', { source_slug: slug });

      results.push({
        source: scraper.name,
        success: false,
        articlesFound: 0,
        articlesNew: 0,
        error: errorMsg,
      });
    }

    // Polite delay between sources (1 second)
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Finalize scrape run
  const sourcesSucceeded = results.filter((r) => r.success).length;
  const totalNew = results.reduce((s, r) => s + r.articlesNew, 0);
  const totalFound = results.reduce((s, r) => s + r.articlesFound, 0);

  if (runId) {
    await supabase
      .from('scrape_runs')
      .update({
        status: sourcesSucceeded === 0 ? 'failed' : sourcesSucceeded < scraperEntries.length ? 'partial' : 'completed',
        finished_at: new Date().toISOString(),
        sources_succeeded: sourcesSucceeded,
        articles_found: totalFound,
        articles_new: totalNew,
        error_log: results.filter((r) => !r.success).map((r) => ({ source: r.source, error: r.error })),
      })
      .eq('id', runId);
  }

  let orgRefresh:
    | {
        success: boolean;
        unitsChecked: number;
        verifiedSources: number;
      }
    | undefined;

  try {
    const units = await buildGovernmentStructureSnapshot();
    orgRefresh = {
      success: true,
      unitsChecked: units.length,
      verifiedSources: units.filter((unit) => unit.sourceMeta.sourceStatus === 'verified').length,
    };
  } catch {
    orgRefresh = {
      success: false,
      unitsChecked: 0,
      verifiedSources: 0,
    };
  }

  // Recompute promise metrics from real evidence
  let promiseRecompute: { processed: number; updated: number; errors: number } | undefined;
  try {
    promiseRecompute = await recomputeAllPromises();
  } catch {
    promiseRecompute = { processed: 0, updated: 0, errors: 0 };
  }

  return NextResponse.json({
    success: true,
    sourcesAttempted: scraperEntries.length,
    sourcesSucceeded,
    articlesFound: totalFound,
    articlesNew: totalNew,
    governmentStructure: orgRefresh,
    promiseRecompute,
    results,
  });
}
