import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getServiceBySlug } from '@/lib/services/catalog';
import { CATEGORY_ICONS, CATEGORY_LABELS, type ServiceCategory } from '@/lib/services/types';

export const runtime = 'nodejs';

const NEPAL_RED = '#DC143C';
const BG = '#0a0e1a';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || '';
  const svc = slug ? await getServiceBySlug(slug) : null;

  const title = svc?.title.en || 'Nepal Services Directory';
  const titleNe = svc?.title.ne || 'नेपाल सेवा निर्देशिका';
  const provider = svc?.providerName || 'Nepal Republic';
  const category = (svc?.category || 'identity') as ServiceCategory;
  const fee = svc?.feeRange?.en || '';
  const time = svc?.estimatedTime?.en || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: `linear-gradient(135deg, ${BG} 0%, #1a1f35 100%)`,
          padding: 72, color: 'white',
          fontFamily: 'system-ui',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 8,
          background: `linear-gradient(90deg, ${NEPAL_RED}, #003893)`,
        }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{
            fontSize: 28, fontWeight: 900, color: NEPAL_RED, letterSpacing: -0.5,
          }}>
            नेपाल रिपब्लिक · Nepal Republic
          </div>
        </div>

        {/* Category badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        }}>
          <div style={{ fontSize: 56 }}>{CATEGORY_ICONS[category]}</div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: 2,
          }}>
            {CATEGORY_LABELS[category].en}
          </div>
        </div>

        {/* Title */}
        <div style={{
          display: 'flex', fontSize: 68, fontWeight: 900,
          lineHeight: 1.05, marginBottom: 12, maxWidth: '100%',
        }}>
          {title}
        </div>
        <div style={{
          display: 'flex', fontSize: 34, color: '#cbd5e1', marginBottom: 32,
        }}>
          {titleNe}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 40, marginTop: 'auto', alignItems: 'center' }}>
          {time && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 16, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Time</div>
              <div style={{ fontSize: 24, color: 'white', fontWeight: 700 }}>{time}</div>
            </div>
          )}
          {fee && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 16, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Fee</div>
              <div style={{ fontSize: 24, color: 'white', fontWeight: 700 }}>{fee}</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 16, color: '#64748b' }}>{provider}</div>
            <div style={{ fontSize: 20, color: NEPAL_RED, fontWeight: 700 }}>
              nepalrepublic.org/services
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
