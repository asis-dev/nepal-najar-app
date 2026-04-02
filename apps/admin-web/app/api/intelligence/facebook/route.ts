import { NextRequest, NextResponse } from 'next/server';
import { scrapeFacebookPages } from '@/lib/intelligence/collectors/facebook-scraper';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

// POST: Trigger Facebook scrape manually
export async function POST(request: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;

  if (!bearerMatchesSecret(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await scrapeFacebookPages();

    return NextResponse.json({
      status: result.errors.length === 0 ? 'success' : 'partial',
      postsFound: result.postsFound,
      newPosts: result.newPosts,
      errors: result.errors,
      method: process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN ? 'apify' : 'duckduckgo',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Facebook scrape failed' },
      { status: 500 },
    );
  }
}

export const maxDuration = 300; // 5 minutes — Apify runs can take a while
