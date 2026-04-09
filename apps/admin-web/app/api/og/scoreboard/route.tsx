import { ImageResponse } from 'next/og';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 600;

export async function GET() {
  let s: any = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('weekly_scoreboards')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(1)
        .single();
      s = data;
    } catch {}
  }
  const grade = s?.stats?.grade || '?';
  const avg = s?.stats?.avg_progress ?? 0;
  const stalled = s?.stats?.stalled ?? 0;
  const inProgress = s?.stats?.in_progress ?? 0;
  const delivered = s?.stats?.delivered ?? 0;
  const week = s?.week_start || '—';

  const gradeColor =
    grade === 'A' ? '#10b981' : grade === 'B' ? '#84cc16' : grade === 'C' ? '#eab308' : grade === 'D' ? '#f97316' : '#dc143c';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 100%)',
          padding: 60,
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#dc143c', padding: '6px 14px', borderRadius: 999, fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
            WEEKLY SCOREBOARD
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#a1a1aa' }}>Week of {week}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 50 }}>
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 32,
              background: gradeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 160,
              fontWeight: 900,
            }}
          >
            {grade}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 28, color: '#a1a1aa' }}>RSP Government</div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, marginTop: 8 }}>{avg}%</div>
            <div style={{ display: 'flex', fontSize: 22, color: '#a1a1aa', marginTop: 8 }}>average commitment progress</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 50 }}>
          <Stat label="Stalled" v={stalled} color="#fb7185" />
          <Stat label="In progress" v={inProgress} color="#a3e635" />
          <Stat label="Delivered" v={delivered} color="#10b981" />
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, color: '#dc143c' }}>NEPAL REPUBLIC</div>
          <div style={{ display: 'flex', fontSize: 18, color: '#71717a' }}>nepalrepublic.org/scoreboard-weekly</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Stat({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#18181b', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', fontSize: 18, color: '#71717a' }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 48, fontWeight: 900, color }}>{v}</div>
    </div>
  );
}
