import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';

interface SectionTheme {
  accent: string;
  emoji: string;
  label: string;
  labelNe: string;
  tagline: string;
  taglineNe: string;
}

const SECTION_THEMES: Record<string, SectionTheme> = {
  commitments: { accent: '#22d3ee', emoji: '📊', label: 'COMMITMENT TRACKER', labelNe: 'प्रतिबद्धता ट्र्याकर', tagline: 'Tracking government promises with AI-backed evidence', taglineNe: 'AI-प्रमाणित सरकारी वाचा ट्र्याकिङ' },
  corruption:  { accent: '#ef4444', emoji: '🔍', label: 'CORRUPTION WATCH', labelNe: 'भ्रष्टाचार निगरानी', tagline: 'Follow the money. Expose the truth.', taglineNe: 'पैसा पछ्याउनुहोस्। सत्य उजागर गर्नुहोस्।' },
  complaints:  { accent: '#f59e0b', emoji: '📢', label: 'CIVIC COMPLAINTS', labelNe: 'नागरिक गुनासो', tagline: 'Report it. Route it. Resolve it.', taglineNe: 'रिपोर्ट गर्नुहोस्। समाधान गर्नुहोस्।' },
  report:      { accent: '#8b5cf6', emoji: '📋', label: 'REPORT CARD', labelNe: 'रिपोर्ट कार्ड', tagline: 'AI-scored government accountability', taglineNe: 'AI-स्कोर सरकारी जवाफदेहिता' },
  proposals:   { accent: '#10b981', emoji: '💡', label: 'PROPOSALS', labelNe: 'प्रस्तावहरू', tagline: 'Propose. Vote. Build.', taglineNe: 'प्रस्ताव। मत। निर्माण।' },
  ministers:   { accent: '#3b82f6', emoji: '👤', label: 'MINISTER PROFILE', labelNe: 'मन्त्री प्रोफाइल', tagline: 'Tracking ministerial activity & commitments', taglineNe: 'मन्त्रीको गतिविधि र प्रतिबद्धता ट्र्याकिङ' },
  projects:    { accent: '#06b6d4', emoji: '🏗️', label: 'PROJECT TRACKER', labelNe: 'परियोजना ट्र्याकर', tagline: 'Track projects, blockers, and delivery progress', taglineNe: 'परियोजना, अवरोध र प्रगति ट्र्याकिङ' },
  articles:    { accent: '#60a5fa', emoji: '📰', label: 'NEWS INTELLIGENCE', labelNe: 'समाचार विश्लेषण', tagline: 'AI-verified news coverage of government activity', taglineNe: 'AI-प्रमाणित सरकारी समाचार' },
  evidence:    { accent: '#38bdf8', emoji: '📁', label: 'EVIDENCE VAULT', labelNe: 'प्रमाण भण्डार', tagline: 'Who said what, when — with sources', taglineNe: 'कसले के कहिले भन्यो — स्रोतसहित' },
  stories:     { accent: '#d946ef', emoji: '📡', label: 'DAILY BRIEF', labelNe: 'दैनिक ब्रिफ', tagline: 'AI-curated daily intelligence on Nepal', taglineNe: 'AI-संचालित दैनिक जानकारी' },
  daily:       { accent: '#d946ef', emoji: '📡', label: 'DAILY BRIEF', labelNe: 'दैनिक ब्रिफ', tagline: 'AI-curated daily intelligence on Nepal', taglineNe: 'AI-संचालित दैनिक जानकारी' },
  'what-changed': { accent: '#a78bfa', emoji: '🧭', label: 'WHAT CHANGED', labelNe: 'के परिवर्तन भयो', tagline: 'Recent verified changes across the tracker', taglineNe: 'ट्र्याकरभरिका पछिल्ला प्रमाणित परिवर्तनहरू' },
  scorecard:   { accent: '#8b5cf6', emoji: '📊', label: 'SCORECARD', labelNe: 'स्कोरकार्ड', tagline: 'AI-scored government accountability', taglineNe: 'AI-स्कोर सरकारी जवाफदेहिता' },
  dashboard:   { accent: '#22d3ee', emoji: '🇳🇵', label: 'LIVE DASHBOARD', labelNe: 'लाइभ ड्यासबोर्ड', tagline: 'From street problems to national promises, one AI-powered, evidence-backed accountability platform.', taglineNe: 'सडकका समस्या देखि राष्ट्रिय वाचासम्म, एउटै AI-संचालित, प्रमाण-आधारित जवाफदेहिता प्लेटफर्म।' },
};

const DEFAULT_THEME: SectionTheme = { accent: '#22d3ee', emoji: '🔔', label: '', labelNe: '', tagline: 'From street problems to national promises, one AI-powered, evidence-backed accountability platform.', taglineNe: 'सडकका समस्या देखि राष्ट्रिय वाचासम्म, एउटै AI-संचालित, प्रमाण-आधारित जवाफदेहिता प्लेटफर्म।' };

const STATUS_LABELS: Record<string, { en: string; ne: string }> = {
  in_progress: { en: 'IN PROGRESS', ne: 'प्रगतिमा' },
  delivered: { en: 'DELIVERED', ne: 'पूरा भयो' },
  stalled: { en: 'STALLED', ne: 'रोकिएको' },
  not_started: { en: 'NOT STARTED', ne: 'सुरु भएको छैन' },
  alleged: { en: 'ALLEGED', ne: 'आरोपित' },
  under_investigation: { en: 'UNDER INVESTIGATION', ne: 'अनुसन्धानमा' },
  charged: { en: 'CHARGED', ne: 'अभियोग' },
  convicted: { en: 'CONVICTED', ne: 'दोषी ठहर' },
  acquitted: { en: 'ACQUITTED', ne: 'सफाइ' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Nepal Republic';
  const subtitle = searchParams.get('subtitle') || '';
  const progress = searchParams.get('progress');
  const status = searchParams.get('status');
  const section = searchParams.get('section');
  const locale = searchParams.get('locale') || 'en';
  const stats = searchParams.get('stats');

  const isNe = locale === 'ne';
  const theme = (section && SECTION_THEMES[section]) || DEFAULT_THEME;

  const statusColor =
    status === 'in_progress' ? '#22d3ee'
    : status === 'delivered' ? '#10b981'
    : status === 'stalled' ? '#ef4444'
    : status === 'not_started' ? '#6b7280'
    : status === 'alleged' ? '#f59e0b'
    : status === 'under_investigation' ? '#f97316'
    : status === 'charged' ? '#ef4444'
    : status === 'convicted' ? '#dc2626'
    : status === 'acquitted' ? '#10b981'
    : '#60a5fa';

  const statusLabel = status
    ? (STATUS_LABELS[status]?.[isNe ? 'ne' : 'en'] || status.toUpperCase().replace(/_/g, ' '))
    : null;

  const progressNum = progress ? Math.min(100, Number(progress)) : 0;
  const sectionLabel = isNe ? theme.labelNe : theme.label;
  const tagline = isNe ? theme.taglineNe : theme.tagline;

  const bgGradient = section === 'corruption'
    ? `linear-gradient(160deg, #0c0506 0%, #1c0808 30%, #2a0a0a 60%, #0c0506 100%)`
    : section === 'commitments'
    ? `linear-gradient(160deg, #060810 0%, #0a1020 40%, #081018 70%, #060810 100%)`
    : section === 'ministers'
    ? `linear-gradient(160deg, #060810 0%, #0c1428 50%, #060810 100%)`
    : `linear-gradient(160deg, #08080f 0%, #0c1020 40%, #100a14 70%, #08080f 100%)`;

  const titleSize = title.length > 80 ? 30 : title.length > 50 ? 36 : 44;
  const statItems = stats ? stats.split('|').slice(0, 4) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgGradient,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
          }}
        />

        {/* Subtle glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${theme.accent}08 0%, transparent 70%)`,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '50px 80px',
            maxWidth: '1100px',
          }}
        >
          {/* Brand + section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '18px' }}>🔔</span>
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: BELL_GOLD,
              }}
            >
              {isNe ? 'नेपाल रिपब्लिक' : 'NEPAL REPUBLIC'}
            </span>
            {sectionLabel ? (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: isNe ? '0.05em' : '0.15em',
                  color: theme.accent,
                  padding: '3px 12px',
                  borderRadius: '100px',
                  background: `${theme.accent}15`,
                  border: `1px solid ${theme.accent}30`,
                  marginLeft: '4px',
                }}
              >
                {sectionLabel}
              </span>
            ) : null}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: `${titleSize}px`,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: subtitle ? '12px' : '0px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle ? (
            <div
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {/* Progress bar */}
          {progress ? (
            <div
              style={{
                marginTop: '28px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 800,
                  color: statusColor,
                  display: 'flex',
                }}
              >
                {`${progressNum}%`}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '280px',
                    height: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: `${progressNum}%`,
                      height: '12px',
                      borderRadius: '6px',
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: statusColor,
                  }}
                >
                  {statusLabel || (isNe ? 'प्रगति' : 'PROGRESS')}
                </div>
              </div>
            </div>
          ) : null}

          {/* Status badge */}
          {statusLabel && !progress ? (
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '6px 20px',
                  borderRadius: '100px',
                  backgroundColor: `${statusColor}18`,
                  border: `1px solid ${statusColor}30`,
                  color: statusColor,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                }}
              >
                {statusLabel}
              </div>
            </div>
          ) : null}

          {/* Stats row */}
          {statItems.length > 0 ? (
            <div
              style={{
                marginTop: '32px',
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
              }}
            >
              {statItems.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {stat.trim()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '13px',
          }}
        >
          <span style={{ color: BELL_GOLD }}>nepalrepublic.org</span>
          <span style={{ display: 'flex' }}>·</span>
          <span style={{ display: 'flex' }}>{tagline}</span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${NEPAL_RED}80, ${BELL_GOLD}60, ${NEPAL_BLUE}80)`,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
