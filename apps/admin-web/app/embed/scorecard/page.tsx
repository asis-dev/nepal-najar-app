import { getPromises } from '@/lib/data';

export const revalidate = 600;
export const metadata = {
  title: 'Nepal Republic scorecard widget',
  robots: { index: false },
};

function gradeFor(avg: number) {
  if (avg >= 85) return { g: 'A', color: '#10b981' };
  if (avg >= 70) return { g: 'B', color: '#84cc16' };
  if (avg >= 55) return { g: 'C', color: '#eab308' };
  if (avg >= 40) return { g: 'D', color: '#f97316' };
  return { g: 'F', color: '#dc143c' };
}

export default async function EmbedScorecard() {
  const promises = await getPromises();
  const total = promises.length;
  const stalled = promises.filter((p) => p.status === 'stalled').length;
  const inProgress = promises.filter((p) => p.status === 'in_progress').length;
  const completed = promises.filter((p) => p.status === 'delivered').length;
  const notStarted = total - stalled - inProgress - completed;
  const avg = promises.reduce((s, p) => s + (p.progress || 0), 0) / (total || 1);
  const grade = gradeFor(avg);

  return (
    <a
      href="https://nepalrepublic.org/report-card"
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'white',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0505 100%)',
        border: '1px solid #27272a',
        borderRadius: 16,
        padding: 20,
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            background: '#dc143c',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          LIVE · NEPAL REPUBLIC
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: grade.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            fontWeight: 900,
            color: 'white',
          }}
        >
          {grade.g}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: '#a1a1aa' }}>RSP Government — 109 commitments</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 2 }}>
            {avg.toFixed(1)}% avg progress
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, fontSize: 12 }}>
        <div style={{ flex: 1, padding: 8, background: '#18181b', borderRadius: 8 }}>
          <div style={{ color: '#71717a' }}>Stalled</div>
          <div style={{ color: '#fb7185', fontWeight: 800, fontSize: 16 }}>{stalled}</div>
        </div>
        <div style={{ flex: 1, padding: 8, background: '#18181b', borderRadius: 8 }}>
          <div style={{ color: '#71717a' }}>In progress</div>
          <div style={{ color: '#a3e635', fontWeight: 800, fontSize: 16 }}>{inProgress}</div>
        </div>
        <div style={{ flex: 1, padding: 8, background: '#18181b', borderRadius: 8 }}>
          <div style={{ color: '#71717a' }}>Not started</div>
          <div style={{ color: '#a1a1aa', fontWeight: 800, fontSize: 16 }}>{notStarted}</div>
        </div>
        <div style={{ flex: 1, padding: 8, background: '#18181b', borderRadius: 8 }}>
          <div style={{ color: '#71717a' }}>Done</div>
          <div style={{ color: '#10b981', fontWeight: 800, fontSize: 16 }}>{completed}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#52525b', textAlign: 'right' }}>
        Updated · nepalrepublic.org
      </div>
    </a>
  );
}
