/**
 * GET /api/scrape/status
 * Returns recent scrape runs and data source health.
 * Auth: Bearer SCRAPE_SECRET
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    // Get last 10 scrape runs
    const { data: runs, error: runsError } = await supabase
      .from('scrape_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    if (runsError) throw runsError;

    // Get data source health
    const { data: sources, error: sourcesError } = await supabase
      .from('data_sources')
      .select('*')
      .order('name');

    if (sourcesError) throw sourcesError;

    // Get total article count
    const { count: totalArticles } = await supabase
      .from('scraped_articles')
      .select('*', { count: 'exact', head: true });

    // Get unprocessed count
    const { count: unprocessedArticles } = await supabase
      .from('scraped_articles')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false);

    return NextResponse.json({
      runs: runs || [],
      sources: sources || [],
      stats: {
        totalArticles: totalArticles || 0,
        unprocessedArticles: unprocessedArticles || 0,
        activeSources: (sources || []).filter((s: { is_active: boolean }) => s.is_active).length,
        totalSources: (sources || []).length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
