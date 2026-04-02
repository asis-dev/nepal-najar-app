/**
 * POST /api/scrape/match
 * Run promise keyword matcher on unprocessed articles.
 * Auth: Bearer SCRAPE_SECRET
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { matchArticleToPromises } from '@/lib/scraper/matcher';

export async function POST(request: Request) {
  if (!(await validateScrapeAuth(request))) {
    return unauthorizedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    // Get unprocessed articles
    const { data: articles, error } = await supabase
      .from('scraped_articles')
      .select('id, headline, headline_ne, content_excerpt')
      .eq('is_processed', false)
      .limit(50);

    if (error) throw error;
    if (!articles || articles.length === 0) {
      return NextResponse.json({ matched: 0, message: 'No unprocessed articles' });
    }

    let matchedCount = 0;

    for (const article of articles) {
      const match = matchArticleToPromises({
        headline: article.headline,
        headline_ne: article.headline_ne,
        content_excerpt: article.content_excerpt,
      });

      await supabase
        .from('scraped_articles')
        .update({
          promise_ids: match.promiseIds,
          confidence: match.confidence,
          classification: match.classification,
          is_processed: true,
        })
        .eq('id', article.id);

      if (match.promiseIds.length > 0) matchedCount++;
    }

    return NextResponse.json({
      processed: articles.length,
      matched: matchedCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
