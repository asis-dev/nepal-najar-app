/**
 * POST /api/revalidate
 * On-demand ISR revalidation triggered after scraping.
 * Auth: Bearer SCRAPE_SECRET (same secret)
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';

export async function POST(request: Request) {
  if (!(await validateScrapeAuth(request))) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json().catch(() => ({}));
    const paths = body.paths || ['/', '/explore', '/report-card', '/daily'];

    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({
      revalidated: true,
      paths,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
