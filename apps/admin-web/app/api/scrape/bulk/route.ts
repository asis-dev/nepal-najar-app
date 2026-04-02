/**
 * POST /api/scrape/bulk — The Beast
 * Harvests ALL sources and stores every article URL found.
 * No AI, no deep read — just raw URL harvesting at scale.
 * Designed to be called before /api/scrape/analyze.
 *
 * Body: { sources?: string[], maxPerSource?: number }
 * Auth: Bearer SCRAPE_SECRET
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { scrapers, scrapeSource, createScrapeRun, finalizeScrapeRun } from '@/lib/scraper';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { matchArticleToPromises } from '@/lib/scraper/matcher';

export const maxDuration = 300; // 5 min — process all sources

export async function POST(request: Request) {
  if (!(await validateScrapeAuth(request))) {
    return unauthorizedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedSources = body.sources as string[] | undefined;
    const sourcesToScrape = requestedSources
      ? Object.entries(scrapers).filter(([slug]) => requestedSources.includes(slug))
      : Object.entries(scrapers);

    const startTime = Date.now();
    const runId = await createScrapeRun('manual');

    const results = {
      totalSources: sourcesToScrape.length,
      sourcesSucceeded: 0,
      sourcesFailed: 0,
      totalArticlesFound: 0,
      totalArticlesNew: 0,
      totalArticlesMatched: 0,
      unprocessedRemaining: 0,
      sourceResults: [] as Array<{ source: string; found: number; new: number; matched: number; error?: string }>,
    };

    for (const [slug, scraper] of sourcesToScrape) {
      try {
        console.log(`[bulk] Scraping ${slug}...`);
        const articles = await scraper.scrape();

        if (articles.length === 0) {
          results.sourceResults.push({ source: slug, found: 0, new: 0, matched: 0 });
          results.sourcesFailed++;
          continue;
        }

        // Upsert all articles
        const { data: upserted, error: upsertErr } = await supabase
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
          .select('id, headline, headline_ne, content_excerpt');

        if (upsertErr) {
          throw new Error(upsertErr.message);
        }

        const newArticles = upserted || [];

        // Run keyword matcher on new articles immediately
        let matched = 0;
        for (const art of newArticles) {
          const match = matchArticleToPromises({
            headline: art.headline || '',
            headline_ne: art.headline_ne,
            content_excerpt: art.content_excerpt || '',
          });

          if (match.promiseIds.length > 0) {
            matched++;
            await supabase
              .from('scraped_articles')
              .update({
                promise_ids: match.promiseIds,
                confidence: match.confidence,
                classification: match.classification,
                // Don't mark as processed — AI still needs to analyze
              })
              .eq('id', art.id);
          }
        }

        results.sourcesSucceeded++;
        results.totalArticlesFound += articles.length;
        results.totalArticlesNew += newArticles.length;
        results.totalArticlesMatched += matched;
        results.sourceResults.push({
          source: slug,
          found: articles.length,
          new: newArticles.length,
          matched,
        });

        // Update source health
        await supabase
          .from('data_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            consecutive_failures: 0,
          })
          .eq('slug', slug);

      } catch (err) {
        results.sourcesFailed++;
        results.sourceResults.push({
          source: slug,
          found: 0,
          new: 0,
          matched: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Polite delay between sources
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Count unprocessed articles remaining
    const { count } = await supabase
      .from('scraped_articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_processed', false);
    results.unprocessedRemaining = count || 0;

    // Finalize scrape run
    if (runId) {
      await finalizeScrapeRun(runId, results.sourceResults.map(r => ({
        source: r.source,
        success: !r.error,
        articlesFound: r.found,
        articlesNew: r.new,
        durationMs: 0,
        error: r.error,
      })));
    }

    return NextResponse.json({
      ...results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
