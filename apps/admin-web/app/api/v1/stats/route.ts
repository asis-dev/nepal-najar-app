import { NextRequest, NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

/**
 * GET /api/v1/stats
 * Returns aggregate stats for all promises.
 * Rate limited: 100 requests/min per IP.
 */
export async function GET(request: NextRequest) {
  // Rate limit: 100/min per IP
  const ip = getClientIp(request);
  const { success, remaining } = await rateLimit(`api:${ip}`, 100, 60000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' },
      }
    );
  }

  const allCommitments = (await getPromises()).filter((commitment) =>
    isPublicCommitment(commitment),
  );
  const total = allCommitments.length;

  const byStatus = {
    not_started: allCommitments.filter((p) => p.status === 'not_started').length,
    in_progress: allCommitments.filter((p) => p.status === 'in_progress').length,
    delivered: allCommitments.filter((p) => p.status === 'delivered').length,
    stalled: allCommitments.filter((p) => p.status === 'stalled').length,
  };

  // Group by category
  const categoryMap = new Map<string, number>();
  for (const p of allCommitments) {
    categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + 1);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  const avgProgress =
    total > 0
      ? Math.round(allCommitments.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0;

  return NextResponse.json(
    {
      total,
      byStatus,
      byCategory,
      avgProgress,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
