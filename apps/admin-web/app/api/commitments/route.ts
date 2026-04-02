import { NextRequest, NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';
import { isPublicCommitment, toPublicCommitment } from '@/lib/data/commitments';

const COMMITMENTS_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const scope = searchParams.get('scope');
  const format = searchParams.get('format');
  const parsedLimit = parseInt(searchParams.get('limit') ?? '100', 10);
  const limit = Math.min(Number.isFinite(parsedLimit) ? parsedLimit : 100, 250);

  const filteredCommitments = (await getPromises())
    .filter((commitment) => isPublicCommitment(commitment))
    .filter((commitment) => (status ? commitment.status === status : true))
    .filter((commitment) => (scope ? (commitment.scope || commitment.geoScope || 'unknown') === scope : true))
    .slice(0, limit);

  if (format === 'full') {
    return NextResponse.json({
      total: filteredCommitments.length,
      commitments: filteredCommitments,
    }, {
      headers: COMMITMENTS_CACHE_HEADERS,
    });
  }

  const commitments = filteredCommitments.map((commitment) => toPublicCommitment(commitment));

  return NextResponse.json({
    total: commitments.length,
    commitments,
  }, {
    headers: COMMITMENTS_CACHE_HEADERS,
  });
}
