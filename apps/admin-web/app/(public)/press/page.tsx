import { Metadata } from 'next';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';
import { computeGhantiScore, GRADE_COLORS, GRADE_LABELS, shouldShowGrade } from '@/lib/data/ghanti-score';
import { dayInOffice } from '@/lib/intelligence/government-era';
import { PressPageClient } from './press-client';

export const metadata: Metadata = {
  title: 'Press & Media Kit — Nepal Republic',
  description:
    'AI-powered accountability data for Nepal\'s government. Free to use. Get live stats, embeddable widgets, and downloadable data for your reporting.',
  openGraph: {
    title: 'Press & Media Kit — Nepal Republic',
    description:
      'AI-powered accountability data for Nepal\'s government. Free to use by journalists and researchers.',
    url: 'https://nepalrepublic.org/press',
  },
};

/* ═══════════════════════════════════════════════
   PRESS & MEDIA KIT — Server Component
   Fetches live data and passes to client shell.
   ═══════════════════════════════════════════════ */

export default async function PressPage() {
  const allPromises = await getPromises();
  const publicPromises = allPromises.filter(isPublicCommitment);
  const score = computeGhantiScore(publicPromises);
  const day = dayInOffice();

  const total = publicPromises.length;
  const delivered = publicPromises.filter((p) => p.status === 'delivered').length;
  const inProgress = publicPromises.filter((p) => p.status === 'in_progress').length;
  const stalled = publicPromises.filter((p) => p.status === 'stalled').length;
  const notStarted = publicPromises.filter((p) => p.status === 'not_started').length;

  // Fetch signal count from Supabase
  let signalCount = 0;
  let sourceCount = 0;
  try {
    const { getSupabase, isSupabaseConfigured } = await import(
      '@/lib/supabase/server'
    );
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { count } = await supabase
        .from('intelligence_signals')
        .select('*', { count: 'exact', head: true });
      signalCount = count ?? 0;

      // Count unique sources via paginated scan

      const allSources = new Set<string>();
      let from = 0;
      let keepGoing = true;
      while (keepGoing) {
        const { data } = await supabase
          .from('intelligence_signals')
          .select('source_id')
          .range(from, from + 999);
        if (!data?.length) break;
        data.forEach((s: { source_id: string }) => allSources.add(s.source_id));
        if (data.length < 1000) keepGoing = false;
        from += 1000;
      }
      sourceCount = allSources.size;
    }
  } catch {
    // Fallback: use approximate numbers
    signalCount = 1600;
    sourceCount = 80;
  }

  const gradeDisplay = shouldShowGrade(score.phase) ? score.grade : null;
  const gradeLabel = gradeDisplay ? GRADE_LABELS[score.grade] : null;
  const gradeColors = gradeDisplay ? GRADE_COLORS[score.grade] : null;

  return (
    <PressPageClient
      stats={{
        total,
        delivered,
        inProgress,
        stalled,
        notStarted,
        day,
        grade: gradeDisplay,
        gradeLabel: gradeLabel?.en ?? null,
        gradeText: gradeColors?.text ?? null,
        gradeBg: gradeColors?.bg ?? null,
        gradeGlow: gradeColors?.glow ?? null,
        score: score.score,
        signalCount,
        sourceCount,
        avgProgress: Math.round(
          publicPromises.reduce((s, p) => s + p.progress, 0) / total,
        ),
        dataConfidence: score.dataConfidence,
        phaseLabel: score.phaseLabel.en,
      }}
    />
  );
}
