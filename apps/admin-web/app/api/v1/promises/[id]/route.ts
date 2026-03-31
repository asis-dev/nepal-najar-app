import { NextRequest, NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

/**
 * GET /api/v1/promises/:id
 * Returns full promise detail by ID or slug.
 * Rate limited: 100 requests/min per IP.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 100/min per IP
  const ip = getClientIp(request);
  const { success, remaining } = rateLimit(`api:${ip}`, 100, 60000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' },
      }
    );
  }

  const { id } = await params;
  const allCommitments = (await getPromises()).filter((commitment) =>
    isPublicCommitment(commitment),
  );

  // Look up by ID or slug
  const promise = allCommitments.find((p) => String(p.id) === id || p.slug === id);

  if (!promise) {
    return NextResponse.json(
      { error: 'Promise not found' },
      { status: 404 }
    );
  }

  const data = {
    id: promise.id,
    slug: promise.slug,
    title: promise.title,
    title_ne: promise.title_ne,
    category: promise.category,
    category_ne: promise.category_ne,
    status: promise.status,
    progress: promise.progress,
    linkedProjects: promise.linkedProjects,
    evidenceCount: promise.evidenceCount,
    lastUpdate: promise.lastUpdate,
    description: promise.description,
    description_ne: promise.description_ne,
    trustLevel: promise.trustLevel,
    signalType: promise.signalType,
    reviewState: promise.reviewState,
    scope: promise.scope || promise.geoScope || 'unknown',
    actors: promise.actors || [],
    sourceCount: promise.sourceCount ?? 0,
    lastSignalAt: promise.lastSignalAt ?? null,
    deadline: promise.deadline ?? null,
    estimatedBudgetNPR: promise.estimatedBudgetNPR ?? null,
    spentNPR: promise.spentNPR ?? null,
    fundingSource: promise.fundingSource ?? null,
    fundingSource_ne: promise.fundingSource_ne ?? null,
  };

  return NextResponse.json(
    { data },
    {
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
