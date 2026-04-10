import { NextRequest, NextResponse } from 'next/server';
import { getPortalDeepLinks } from '@/lib/integrations/portal-deeplinks';

export const runtime = 'edge';
export const revalidate = 3600; // cache for 1 hour

/**
 * GET /api/services/:slug/portal-links
 *
 * Returns portal deep-links for a service.
 * Optionally accepts a `formData` query param (JSON-encoded)
 * to generate pre-filled URLs.
 *
 * Public endpoint — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  let formData: Record<string, any> | undefined;
  const formDataParam = request.nextUrl.searchParams.get('formData');
  if (formDataParam) {
    try {
      formData = JSON.parse(formDataParam);
    } catch {
      // Ignore invalid JSON, just skip pre-filling
    }
  }

  const links = getPortalDeepLinks(slug, formData);

  return NextResponse.json(
    { links, serviceSlug: slug },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    }
  );
}
