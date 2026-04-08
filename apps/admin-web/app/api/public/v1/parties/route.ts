import { NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';

export const runtime = 'nodejs';
export const revalidate = 600;

// RSP is the governing party; Congress + UML are the main opposition/coalition context.
// For MVP we only compute RSP since our 109 commitments are theirs.
const PARTIES = [
  { slug: 'rsp', name: 'Rastriya Swatantra Party', name_ne: 'राष्ट्रिय स्वतन्त्र पार्टी', in_power: true },
  { slug: 'congress', name: 'Nepali Congress', name_ne: 'नेपाली कांग्रेस', in_power: false },
  { slug: 'uml', name: 'CPN-UML', name_ne: 'नेकपा एमाले', in_power: false },
];

function gradeFor(avg: number): string {
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 55) return 'C';
  if (avg >= 40) return 'D';
  return 'F';
}

export async function GET() {
  const promises = await getPromises();
  // All 109 are RSP for MVP
  const rspCommitments = promises;
  const total = rspCommitments.length;
  const byStatus: Record<string, number> = {};
  let progressSum = 0;
  for (const p of rspCommitments) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    progressSum += p.progress || 0;
  }
  const avgProgress = total ? progressSum / total : 0;

  const items = PARTIES.map((party) => {
    if (party.slug !== 'rsp') {
      return {
        ...party,
        commitment_count: 0,
        avg_progress: null,
        grade: null,
        status_breakdown: {},
        note: 'No tracked commitments (not in power).',
      };
    }
    return {
      ...party,
      commitment_count: total,
      avg_progress: Math.round(avgProgress * 10) / 10,
      grade: gradeFor(avgProgress),
      status_breakdown: byStatus,
      url: 'https://nepalrepublic.org/report-card',
    };
  });

  return NextResponse.json(
    {
      version: 'v1',
      updated_at: new Date().toISOString(),
      parties: items,
    },
    { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=600' } }
  );
}
