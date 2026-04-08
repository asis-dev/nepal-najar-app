import { getSupabase } from '@/lib/supabase/server';
import { getPromises } from '@/lib/data';

function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const dow = x.getUTCDay(); // 0=Sun
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

export async function generateWeeklyScoreboard() {
  const promises = await getPromises();
  const total = promises.length;
  const stalled = promises.filter((p) => p.status === 'stalled');
  const inProgress = promises.filter((p) => p.status === 'in_progress');
  const delivered = promises.filter((p) => p.status === 'delivered');
  const avg = promises.reduce((s, p) => s + (p.progress || 0), 0) / (total || 1);
  const grade = avg >= 85 ? 'A' : avg >= 70 ? 'B' : avg >= 55 ? 'C' : avg >= 40 ? 'D' : 'F';

  const worst = [...stalled].sort((a, b) => (a.progress || 0) - (b.progress || 0)).slice(0, 5);

  const headline = `📊 Weekly Scoreboard: RSP Government gets a ${grade} (${avg.toFixed(1)}% avg progress)`;

  const thread = [
    `${headline}\n\n${total} tracked commitments · ${stalled.length} stalled · ${inProgress.length} in progress · ${delivered.length} delivered\n\n🔗 nepalrepublic.org/report-card`,
    `🚨 5 most stalled commitments this week:\n\n${worst
      .map((w, i) => `${i + 1}. ${w.title.slice(0, 80)} (${w.progress || 0}%)`)
      .join('\n')}`,
    `💬 Citizens: demand action at nepalrepublic.org/inbox\n\nStart a petition: nepalrepublic.org/petitions/new\n\nData updates every 4 hours from 80+ sources.`,
  ];

  const stats = {
    total,
    stalled: stalled.length,
    in_progress: inProgress.length,
    delivered: delivered.length,
    avg_progress: Math.round(avg * 10) / 10,
    grade,
  };

  const supabase = getSupabase();
  const { error } = await supabase.from('weekly_scoreboards').upsert(
    {
      week_start: weekStart(),
      headline,
      thread,
      stats,
      published: false,
    },
    { onConflict: 'week_start' }
  );
  if (error) throw error;
  return { week_start: weekStart(), headline, thread, stats };
}
