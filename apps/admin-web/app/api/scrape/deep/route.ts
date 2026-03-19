/**
 * POST /api/scrape/deep
 * Full intelligence pipeline for a single source:
 *   1. Scrape headlines from source
 *   2. Read full article content for new articles
 *   3. AI-analyze each article against 32 government promises
 *   4. Store results in Supabase
 *   5. Update promise evidence counts
 *
 * Body: { source: string, trigger?: string, maxArticles?: number }
 * Auth: Bearer SCRAPE_SECRET
 *
 * This is the "brain" route — called instead of /api/scrape/source when
 * AI analysis is configured.
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { scrapers } from '@/lib/scraper';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { readFullArticle } from '@/lib/scraper/deep-reader';
import { analyzeArticle, isAIConfigured } from '@/lib/scraper/analyzer';
import { matchArticleToPromises } from '@/lib/scraper/matcher';

export const maxDuration = 60; // Vercel Pro: 60s timeout

export async function POST(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { source, trigger = 'manual', maxArticles = 5 } = body;

    const scraper = scrapers[source];
    if (!scraper) {
      return NextResponse.json(
        { error: `Unknown source: ${source}`, available: Object.keys(scrapers) },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const results = {
      source,
      articlesScraped: 0,
      articlesNew: 0,
      articlesAnalyzed: 0,
      promisesUpdated: 0,
      aiEnabled: isAIConfigured(),
      errors: [] as string[],
    };

    // Step 1: Scrape headlines
    let articles;
    try {
      articles = await scraper.scrape();
      results.articlesScraped = articles.length;
    } catch (err) {
      results.errors.push(`Scrape failed: ${err instanceof Error ? err.message : String(err)}`);
      return NextResponse.json({ ...results, durationMs: Date.now() - startTime }, { status: 500 });
    }

    if (articles.length === 0) {
      return NextResponse.json({ ...results, durationMs: Date.now() - startTime });
    }

    // Step 2: Upsert headlines to Supabase (dedup by source_url)
    const { data: upsertedData } = await supabase
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
      .select('id, source_url, headline, is_processed');

    const newArticles = upsertedData || [];
    results.articlesNew = newArticles.length;

    // Step 3: For new articles, read full content + AI analyze
    const articlesToAnalyze = newArticles.slice(0, maxArticles);

    for (const dbArticle of articlesToAnalyze) {
      try {
        // Read full article
        const fullContent = await readFullArticle(
          dbArticle.source_url,
          scraper.language
        );

        if (!fullContent || fullContent.fullText.length < 100) {
          // Fallback to keyword matcher if we can't read the full article
          const match = matchArticleToPromises({
            headline: dbArticle.headline,
            content_excerpt: '',
          });
          await supabase
            .from('scraped_articles')
            .update({
              promise_ids: match.promiseIds,
              confidence: match.confidence,
              classification: match.classification,
              is_processed: true,
            })
            .eq('id', dbArticle.id);
          continue;
        }

        // Update content_excerpt with real content
        await supabase
          .from('scraped_articles')
          .update({
            content_excerpt: fullContent.fullText.slice(0, 1000),
            published_at: fullContent.publishedDate || null,
          })
          .eq('id', dbArticle.id);

        // AI Analysis (if configured)
        if (isAIConfigured()) {
          const analysis = await analyzeArticle({
            headline: fullContent.headline || dbArticle.headline,
            content: fullContent.fullText,
            source_name: scraper.name,
            source_type: scraper.type,
          });

          // Update article with AI results
          const bestConfidence =
            analysis.promiseSignals.length > 0
              ? Math.max(...analysis.promiseSignals.map((s) => s.confidence))
              : 0;

          const bestClassification =
            analysis.promiseSignals.length > 0
              ? analysis.promiseSignals[0].signal
              : 'neutral';

          await supabase
            .from('scraped_articles')
            .update({
              promise_ids: analysis.relevantPromiseIds,
              confidence: bestConfidence,
              classification: bestClassification,
              content_excerpt:
                analysis.summary +
                (analysis.keyFacts.length > 0
                  ? '\n\nKey facts: ' + analysis.keyFacts.join(', ')
                  : ''),
              is_processed: true,
            })
            .eq('id', dbArticle.id);

          // Create promise_updates for high-confidence signals
          for (const signal of analysis.promiseSignals) {
            if (signal.confidence >= 0.6) {
              await supabase.from('promise_updates').insert({
                promise_id: signal.promiseId,
                article_id: dbArticle.id,
                field_changed: 'evidence',
                old_value: null,
                new_value: signal.extractedData || signal.reasoning,
                change_reason: `${signal.signal} (confidence: ${signal.confidence.toFixed(2)}) — ${scraper.name}`,
              });
              results.promisesUpdated++;
            }
          }

          results.articlesAnalyzed++;
        } else {
          // No AI — use keyword matcher
          const match = matchArticleToPromises({
            headline: dbArticle.headline,
            content_excerpt: fullContent.fullText,
          });
          await supabase
            .from('scraped_articles')
            .update({
              promise_ids: match.promiseIds,
              confidence: match.confidence,
              classification: match.classification,
              is_processed: true,
            })
            .eq('id', dbArticle.id);
        }
      } catch (articleErr) {
        results.errors.push(
          `Article ${dbArticle.source_url}: ${articleErr instanceof Error ? articleErr.message : String(articleErr)}`
        );
        // Mark as processed even on error to avoid retrying forever
        await supabase
          .from('scraped_articles')
          .update({ is_processed: true })
          .eq('id', dbArticle.id);
      }

      // Polite delay between articles
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update data_sources health
    await supabase
      .from('data_sources')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        consecutive_failures: 0,
        avg_response_ms: Date.now() - startTime,
      })
      .eq('slug', source);

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
