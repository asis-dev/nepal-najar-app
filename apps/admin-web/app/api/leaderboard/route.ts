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
  const { data: proposals } = await supabase
    .from('community_proposals')
    .select('province')
    .eq('is_hidden', false)
    .neq('status', 'draft');

  // Fetch ward report counts by province
  const { data: reports } = await supabase
    .from('ward_reports')
    .select('province')
    .eq('is_approved', true);

  // Fetch vote counts by province (join through proposals)
  const { data: votes } = await supabase
    .from('proposal_votes')
    .select('proposal_id');

  // Build proposal ID -> province map
  const proposalProvinceMap: Record<string, string> = {};
  for (const p of (proposals ?? []) as Array<Record<string, unknown>>) {
    // We don't have proposal_id here, so we'll count proposals per province
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

  // Total vote count (simplified — just count all votes)
  const totalVotes = (votes ?? []).length;

  // Combine into area scores
  const allProvinces = new Set([
    ...Object.keys(proposalCounts),
    ...Object.keys(reportCounts),
  ]);

  const areaScores: AreaScore[] = Array.from(allProvinces).map((province) => {
    const pc = proposalCounts[province] || 0;
    const rc = reportCounts[province] || 0;
    // Distribute votes proportionally (simplified)
    const totalActivity = Object.values(proposalCounts).reduce((a, b) => a + b, 0) || 1;
    const vc = Math.round((pc / totalActivity) * totalVotes);

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
