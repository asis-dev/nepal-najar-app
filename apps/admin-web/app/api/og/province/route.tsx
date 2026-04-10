import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import {
  promises,
  computeStats,
  type GovernmentPromise,
} from '@/lib/data/promises';

export const runtime = 'edge';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';
const BG_DARK = '#0a0e1a';

const PROVINCE_NAMES_NE: Record<string, string> = {
  Koshi: 'कोशी',
  Madhesh: 'मधेश',
  Bagmati: 'बागमती',
  Gandaki: 'गण्डकी',
  Lumbini: 'लुम्बिनी',
  Karnali: 'कर्णाली',
  Sudurpashchim: 'सुदूरपश्चिम',
};

function normalizeProvince(value: string): string {
  return value.trim().toLowerCase();
}

function isProvinceRelevantPromise(
  promise: GovernmentPromise,
  province: string,
): boolean {
  const target = normalizeProvince(province);

  if (Array.isArray(promise.affectedProvinces) && promise.affectedProvinces.length > 0) {
    return promise.affectedProvinces.some(
      (item) => normalizeProvince(item) === target,
    );
  }

  if (Array.isArray(promise.primaryLocations) && promise.primaryLocations.length > 0) {
    return promise.primaryLocations.some(
      (location) =>
        typeof location?.province === 'string' &&
        normalizeProvince(location.province) === target,
    );
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const province = searchParams.get('province') || 'Bagmati';
  const lang = searchParams.get('lang') || 'en';

  // Normalize province name (case-insensitive lookup)
  const normalizedKey = Object.keys(PROVINCE_NAMES_NE).find(
    (k) => k.toLowerCase() === province.toLowerCase(),
  ) || province;

  const nepaliName = PROVINCE_NAMES_NE[normalizedKey] || province;
  const displayName = lang === 'ne' ? nepaliName : normalizedKey;
  const subtitle = lang === 'ne'
    ? 'प्रदेश-सम्बन्धित प्रतिबद्धता'
    : 'Province-Linked Commitments';

  const provincePromises = promises.filter((p) =>
    isProvinceRelevantPromise(p, normalizedKey),
  );
  const stats = computeStats(provincePromises);
  const hasProvinceData = provincePromises.length > 0;

  const progressColor =
    !hasProvinceData
      ? '#94a3b8'
      : stats.avgProgress < 20
      ? NEPAL_RED
      : stats.avgProgress >= 60
      ? '#10b981'
      : NEPAL_BLUE;

  const statItems = [
    { label: lang === 'ne' ? 'कुल प्रतिबद्धता' : 'Total Commitments', value: stats.total, color: '#e2e8f0' },
    { label: lang === 'ne' ? 'प्रगतिमा' : 'In Progress', value: stats.inProgress, color: '#22d3ee' },
    { label: lang === 'ne' ? 'रोकिएको' : 'Stalled', value: stats.stalled, color: '#ef4444' },
    { label: lang === 'ne' ? 'औसत प्रगति' : 'Avg Progress', value: `${stats.avgProgress}%`, color: progressColor },
  ];

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: BG_DARK,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          padding: '0',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
          }}
        />

        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${NEPAL_RED}12 0%, transparent 70%)`,
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '60px 60px 40px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '26px' }}>🔔</span>
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: BELL_GOLD,
              }}
            >
              NEPAL REPUBLIC
            </div>
          </div>

          {/* Province name */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.1,
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            {displayName}
          </div>

          {/* Secondary name (show the other language) */}
          <div
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {lang === 'ne' ? normalizedKey : nepaliName}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: BELL_GOLD,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '48px',
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              fontSize: '14px',
              color: hasProvinceData
                ? 'rgba(255,255,255,0.45)'
                : 'rgba(255,255,255,0.6)',
              marginBottom: '30px',
              textAlign: 'center',
            }}
          >
            {hasProvinceData
              ? (lang === 'ne'
                  ? 'यस प्रदेशसँग सम्बन्धित प्रतिबद्धताबाट बनेको स्न्यापसट'
                  : 'Snapshot based on commitments tagged to this province')
              : (lang === 'ne'
                  ? 'यस प्रदेशका लागि ट्याग गरिएको प्रतिबद्धता हाल फेला परेन'
                  : 'No province-tagged commitments found yet for this province')}
          </div>

          {/* Stats grid — 2x2 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '720px',
              marginBottom: '48px',
            }}
          >
            {statItems.map((item) => (
              <div
                key={item.label}
                style={{
                  width: '330px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 20px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 800,
                    color: item.color,
                    lineHeight: 1,
                    marginBottom: '8px',
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              width: '100%',
              maxWidth: '600px',
            }}
          >
            <div
            style={{
              flex: 1,
              height: '16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: `${hasProvinceData ? Math.min(100, stats.avgProgress) : 0}%`,
                  height: '100%',
                  borderRadius: '8px',
                  background:
                    stats.avgProgress < 20
                      ? `linear-gradient(90deg, ${NEPAL_RED}, #ef4444)`
                      : stats.avgProgress >= 60
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6)`,
                  boxShadow: `0 0 14px ${progressColor}60`,
                }}
              />
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: progressColor,
                minWidth: '60px',
              }}
            >
              {stats.avgProgress}%
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            paddingBottom: '32px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '16px',
          }}
        >
          <span style={{ color: BELL_GOLD, fontWeight: 700 }}>nepalrepublic.org</span>
          <span>·</span>
          <span>{lang === 'ne' ? 'सेवा, ट्र्याकिङ, र सार्वजनिक सत्य' : 'Services, tracking, and public truth.'}</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  );

  response.headers.set('Cache-Control', 'public, max-age=3600');

  return response;
}
