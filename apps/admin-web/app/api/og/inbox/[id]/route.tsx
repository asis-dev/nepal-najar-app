import { ImageResponse } from 'next/og';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 600;

const KIND_LABEL: Record<string, string> = {
  commitment_stalled: 'STALLED',
  commitment_silent: 'SILENT',
  commitment_overdue: 'OVERDUE',
  complaint_cluster: 'COMPLAINTS',
  portal_down: 'PORTAL DOWN',
  wait_time_bad: 'LONG WAITS',
  service_correction: 'FIX NEEDED',
  petition: 'PETITION',
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let item: any = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('party_action_items')
        .select('*')
        .eq('id', params.id)
        .single();
      item = data;
    } catch {
      /* noop */
    }
  }

  const title = item?.title || 'Nepal Republic — Action Inbox';
  const target = item?.target_name || 'Government of Nepal';
  const kind = KIND_LABEL[item?.source_kind || ''] || 'ACTION';
  const upvotes = item?.upvotes || 0;

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
          <div
            style={{
              background: '#dc143c',
              color: 'white',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            {kind}
          </div>
          <div style={{ fontSize: 20, color: '#a1a1aa' }}>→ {target}</div>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.1,
            marginTop: 40,
            maxWidth: 1080,
            display: 'flex',
          }}
        >
          {title.slice(0, 140)}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#dc143c',
              }}
            >
              NEPAL REPUBLIC
            </div>
            <div style={{ fontSize: 20, color: '#71717a' }}>nepalrepublic.org/inbox</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 24, color: '#a1a1aa' }}>▲</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{upvotes.toLocaleString()}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
