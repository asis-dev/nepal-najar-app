/**
 * POST /api/scrape/source
 * Scrape a single data source. Called by GitHub Actions cron or manually.
 *
 * Body: { source: string, trigger?: 'github_actions' | 'vercel_cron' | 'manual' }
 * Auth: Bearer SCRAPE_SECRET
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { scrapeSource, scrapers } from '@/lib/scraper';

export async function POST(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { source, trigger = 'manual' } = body;

    if (!source) {
      return NextResponse.json(
        {
          error: 'Missing "source" field',
          available: Object.keys(scrapers),
        },
        { status: 400 }
      );
    }

    const result = await scrapeSource(source, trigger);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** GET — list available sources */
export async function GET(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  return NextResponse.json({
    sources: Object.entries(scrapers).map(([slug, s]) => ({
      slug,
      name: s.name,
      url: s.url,
      type: s.type,
      language: s.language,
    })),
  });
}
