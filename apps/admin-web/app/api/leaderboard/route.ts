/**
 * /api/leaderboard — Engagement leaderboard
 *
 * GET ?type=areas   → most engaged provinces/districts
 * GET ?type=citizens → top contributors by karma
 *
 * Computed from: community_proposals, ward_reports, proposal_votes, profiles
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

interface AreaScore {
  province: string;
  proposalCount: number;
  reportCount: number;
  voteCount: number;
  engagementScore: number;
}

interface CitizenScore {
  displayName: string;
  karma: number;
  proposalsCreated: number;
  proposalsAccepted: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'areas';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ leaderboard: [] });
  }

  const supabase = getSupabase();

  if (type === 'citizens') {
    // Top contributors by proposal_karma
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('display_name, proposal_karma, proposals_created, proposals_accepted')
      .order('proposal_karma', { ascending: false })
      .gt('proposal_karma', 0)
      .limit(limit);

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ leaderboard: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leaderboard: CitizenScore[] = (profiles ?? []).map((p: Record<string, unknown>) => ({
      displayName: (p.display_name as string) || 'Anonymous',
      karma: (p.proposal_karma as number) || 0,
      proposalsCreated: (p.proposals_created as number) || 0,
      proposalsAccepted: (p.proposals_accepted as number) || 0,
    }));

    return NextResponse.json({ leaderboard });
  }

  // type === 'areas': compute engagement per province
  // Fetch proposal counts by province
  const { data: proposals, error: proposalsError } = await supabase
    .from('community_proposals')
    .select('id, province')
    .eq('is_hidden', false)
    .neq('status', 'draft');

  // Fetch ward report counts by province
  const { data: reports, error: reportsError } = await supabase
    .from('ward_reports')
    .select('province')
    .eq('is_approved', true);

  // Fetch vote counts by province (join through proposals)
  const { data: votes, error: votesError } = await supabase
    .from('proposal_votes')
    .select('proposal_id');

  const relationMissing = [proposalsError, reportsError, votesError].some((error) => error?.code === '42P01');
  if (relationMissing) {
    return NextResponse.json({ leaderboard: [] });
  }
  const firstUnexpectedError = [proposalsError, reportsError, votesError].find(Boolean);
  if (firstUnexpectedError) {
    return NextResponse.json({ error: firstUnexpectedError.message }, { status: 500 });
  }

  // Build proposal ID -> province map
  const proposalProvinceMap: Record<string, string> = {};
  for (const p of (proposals ?? []) as Array<Record<string, unknown>>) {
    const id = p.id as string | undefined;
    const province = p.province as string | undefined;
    if (id && province) {
      proposalProvinceMap[id] = province;
    }
  }

  // Count proposals per province
  const proposalCounts: Record<string, number> = {};
  for (const p of (proposals ?? []) as Array<Record<string, unknown>>) {
    const prov = p.province as string;
    proposalCounts[prov] = (proposalCounts[prov] || 0) + 1;
  }

  // Count reports per province
  const reportCounts: Record<string, number> = {};
  for (const r of (reports ?? []) as Array<Record<string, unknown>>) {
    const prov = r.province as string;
    reportCounts[prov] = (reportCounts[prov] || 0) + 1;
  }

  // Count votes by province using the real proposal -> province map
  const voteCounts: Record<string, number> = {};
  for (const vote of (votes ?? []) as Array<Record<string, unknown>>) {
    const province = proposalProvinceMap[vote.proposal_id as string];
    if (!province) continue;
    voteCounts[province] = (voteCounts[province] || 0) + 1;
  }

  // Combine into area scores
  const allProvinces = new Set([
    ...Object.keys(proposalCounts),
    ...Object.keys(reportCounts),
    ...Object.keys(voteCounts),
  ]);

  const areaScores: AreaScore[] = Array.from(allProvinces).map((province) => {
    const pc = proposalCounts[province] || 0;
    const rc = reportCounts[province] || 0;
    const vc = voteCounts[province] || 0;

    return {
      province,
      proposalCount: pc,
      reportCount: rc,
      voteCount: vc,
      engagementScore: pc * 3 + rc * 2 + vc,
    };
  });

  // Sort by engagement score descending
  areaScores.sort((a, b) => b.engagementScore - a.engagementScore);

  return NextResponse.json({ leaderboard: areaScores.slice(0, limit) });
}
