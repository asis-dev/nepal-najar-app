import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

/**
 * GET /api/sectors
 * Sector dashboards — aggregation by category.
 *
 * For each sector (Infrastructure, Health, Education, etc.) returns:
 * - tracked commitment count
 * - average progress
 * - status breakdown
 * - active civic issues count
 * - corruption case count
 * - fresh signals in last 7 days
 */
export async function GET(_request: NextRequest) {
  const db = getSupabase();

  // 1. Fetch all promises (commitments)
  const { data: promises } = await db
    .from('promises')
    .select('id, category, status, progress, evidence_count, trust_level');

  // 2. Fetch civic issues grouped by issue type (approximate sector mapping)
  const { data: complaints } = await db
    .from('civic_complaints')
    .select('issue_type, status')
    .not('status', 'in', '("rejected","duplicate","closed")');

  // 3. Fetch corruption cases grouped by sector tag
  const { data: corruptionCases } = await db
    .from('corruption_cases')
    .select('sector, status');

  // 4. Fetch recent signals (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentSignals } = await db
    .from('intelligence_signals')
    .select('promise_ids, created_at')
    .gte('created_at', sevenDaysAgo);

  // Build sector map
  const SECTORS: Record<string, { en: string; ne: string }> = {
    Infrastructure: { en: 'Infrastructure', ne: 'पूर्वाधार' },
    Transport: { en: 'Transport', ne: 'यातायात' },
    Health: { en: 'Health', ne: 'स्वास्थ्य' },
    Education: { en: 'Education', ne: 'शिक्षा' },
    Energy: { en: 'Energy', ne: 'ऊर्जा' },
    Governance: { en: 'Governance', ne: 'सुशासन' },
    'Anti-Corruption': { en: 'Anti-Corruption', ne: 'भ्रष्टाचार निवारण' },
    Economy: { en: 'Economy', ne: 'अर्थतन्त्र' },
    Technology: { en: 'Technology', ne: 'प्रविधि' },
    Environment: { en: 'Environment', ne: 'वातावरण' },
    Social: { en: 'Social', ne: 'सामाजिक' },
  };

  // Map issue_type to sector for civic issues
  const ISSUE_TO_SECTOR: Record<string, string> = {
    roads: 'Infrastructure',
    water: 'Infrastructure',
    electricity: 'Energy',
    health: 'Health',
    education: 'Education',
    sanitation: 'Environment',
    internet: 'Technology',
    safety: 'Governance',
    employment: 'Economy',
    environment: 'Environment',
  };

  // Build promise-id → category lookup
  const promiseIdToCategory = new Map<string, string>();
  const sectorStats = new Map<string, {
    commitments: number;
    avgProgress: number;
    totalProgress: number;
    statusBreakdown: Record<string, number>;
    civicIssues: number;
    unresolvedIssues: number;
    corruptionCases: number;
    recentSignals: number;
    verifiedCount: number;
  }>();

  // Initialize sectors
  for (const key of Object.keys(SECTORS)) {
    sectorStats.set(key, {
      commitments: 0,
      avgProgress: 0,
      totalProgress: 0,
      statusBreakdown: { not_started: 0, in_progress: 0, delivered: 0, stalled: 0 },
      civicIssues: 0,
      unresolvedIssues: 0,
      corruptionCases: 0,
      recentSignals: 0,
      verifiedCount: 0,
    });
  }

  // Aggregate promises
  for (const p of promises || []) {
    const category = (p.category as string) || 'Other';
    const stat = sectorStats.get(category);
    if (!stat) continue;

    promiseIdToCategory.set(p.id as string, category);
    stat.commitments++;
    stat.totalProgress += (p.progress as number) || 0;
    const status = (p.status as string) || 'not_started';
    stat.statusBreakdown[status] = (stat.statusBreakdown[status] || 0) + 1;
    if (p.trust_level === 'verified') stat.verifiedCount++;
  }

  // Compute averages
  for (const stat of sectorStats.values()) {
    stat.avgProgress = stat.commitments > 0
      ? Math.round(stat.totalProgress / stat.commitments)
      : 0;
  }

  // Aggregate civic issues
  for (const c of complaints || []) {
    const sector = ISSUE_TO_SECTOR[(c.issue_type as string) || ''];
    if (!sector) continue;
    const stat = sectorStats.get(sector);
    if (!stat) continue;
    stat.civicIssues++;
    const openStatuses = ['submitted', 'triaged', 'routed', 'acknowledged', 'in_progress', 'needs_info', 'reopened'];
    if (openStatuses.includes(c.status as string)) {
      stat.unresolvedIssues++;
    }
  }

  // Aggregate corruption cases
  for (const cc of corruptionCases || []) {
    const sector = (cc.sector as string) || 'Governance';
    const stat = sectorStats.get(sector);
    if (stat) stat.corruptionCases++;
  }

  // Aggregate recent signals
  for (const sig of recentSignals || []) {
    const promiseIds = (sig.promise_ids as string[]) || [];
    const countedSectors = new Set<string>();
    for (const pid of promiseIds) {
      const sector = promiseIdToCategory.get(pid);
      if (sector && !countedSectors.has(sector)) {
        countedSectors.add(sector);
        const stat = sectorStats.get(sector);
        if (stat) stat.recentSignals++;
      }
    }
  }

  // Build response
  const sectors = Object.entries(SECTORS).map(([key, labels]) => {
    const stat = sectorStats.get(key)!;
    return {
      key,
      name: labels.en,
      name_ne: labels.ne,
      commitments: stat.commitments,
      avg_progress: stat.avgProgress,
      status_breakdown: stat.statusBreakdown,
      civic_issues: stat.civicIssues,
      unresolved_issues: stat.unresolvedIssues,
      corruption_cases: stat.corruptionCases,
      recent_signals: stat.recentSignals,
      verified_count: stat.verifiedCount,
    };
  }).filter((s) => s.commitments > 0)
    .sort((a, b) => b.commitments - a.commitments);

  return NextResponse.json({ sectors, generated_at: new Date().toISOString() });
}
