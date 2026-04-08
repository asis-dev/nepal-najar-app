import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Instagram Story / Reel / Post optimized image (1080×1920 portrait).
 * Supports English and Nepali locale for all labels.
 */

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';

interface SectionTheme {
  accent: string;
  label: string;
  labelNe: string;
  emoji: string;
  hook: string;
  hookNe: string;
}

const SECTION_THEMES: Record<string, SectionTheme> = {
  commitments: { accent: '#22d3ee', label: 'COMMITMENT TRACKER', labelNe: 'प्रतिबद्धता ट्र्याकर', emoji: '📊', hook: 'Is your government keeping its promises?', hookNe: 'के तपाईंको सरकारले वाचा पूरा गर्दैछ?' },
  corruption:  { accent: '#ef4444', label: 'CORRUPTION WATCH', labelNe: 'भ्रष्टाचार निगरानी', emoji: '🔍', hook: 'Follow the money. Expose the truth.', hookNe: 'पैसा पछ्याउनुहोस्। सत्य उजागर गर्नुहोस्।' },
  complaints:  { accent: '#f59e0b', label: 'CIVIC COMPLAINTS', labelNe: 'नागरिक गुनासो', emoji: '📢', hook: 'Report it. Track it. Resolve it.', hookNe: 'रिपोर्ट गर्नुहोस्। ट्र्याक गर्नुहोस्। समाधान गर्नुहोस्।' },
  report:      { accent: '#8b5cf6', label: 'REPORT CARD', labelNe: 'रिपोर्ट कार्ड', emoji: '📋', hook: 'How does your government score?', hookNe: 'तपाईंको सरकारको स्कोर कति छ?' },
  proposals:   { accent: '#10b981', label: 'PROPOSALS', labelNe: 'प्रस्तावहरू', emoji: '💡', hook: 'Citizens proposing real solutions', hookNe: 'नागरिकहरूका वास्तविक समाधान' },
  ministers:   { accent: '#3b82f6', label: 'MINISTER PROFILE', labelNe: 'मन्त्री प्रोफाइल', emoji: '👤', hook: 'Track what your ministers are doing', hookNe: 'तपाईंका मन्त्रीले के गर्दैछन्?' },
  projects:    { accent: '#06b6d4', label: 'PROJECT TRACKER', labelNe: 'परियोजना ट्र्याकर', emoji: '🏗️', hook: 'Track blockers, budgets, and delivery progress', hookNe: 'अवरोध, बजेट र प्रगति ट्र्याक गर्नुहोस्' },
  articles:    { accent: '#60a5fa', label: 'NEWS INTELLIGENCE', labelNe: 'समाचार विश्लेषण', emoji: '📰', hook: 'AI-verified government news', hookNe: 'AI-प्रमाणित सरकारी समाचार' },
  evidence:    { accent: '#38bdf8', label: 'EVIDENCE VAULT', labelNe: 'प्रमाण भण्डार', emoji: '📁', hook: 'Who said what, when, with sources', hookNe: 'कसले के कहिले भन्यो — स्रोतसहित' },
  stories:     { accent: '#d946ef', label: 'DAILY BRIEF', labelNe: 'दैनिक ब्रिफ', emoji: '📡', hook: 'Your daily government intelligence', hookNe: 'तपाईंको दैनिक सरकारी जानकारी' },
  daily:       { accent: '#d946ef', label: 'DAILY BRIEF', labelNe: 'दैनिक ब्रिफ', emoji: '📡', hook: 'Your daily government intelligence', hookNe: 'तपाईंको दैनिक सरकारी जानकारी' },
  'what-changed': { accent: '#a78bfa', label: 'WHAT CHANGED', labelNe: 'के परिवर्तन भयो', emoji: '🧭', hook: 'See what moved today — verified', hookNe: 'आज के बदलियो हेर्नुहोस् — प्रमाणित' },
  scorecard:   { accent: '#8b5cf6', label: 'SCORECARD', labelNe: 'स्कोरकार्ड', emoji: '📊', hook: 'AI-scored government accountability', hookNe: 'AI-स्कोर सरकारी जवाफदेहिता' },
  dashboard:   { accent: '#22d3ee', label: 'LIVE DASHBOARD', labelNe: 'लाइभ ड्यासबोर्ड', emoji: '🇳🇵', hook: 'Real-time government accountability', hookNe: 'रियल-टाइम सरकारी जवाफदेहिता' },
};

const DEFAULT_THEME: SectionTheme = { accent: '#22d3ee', label: '', labelNe: '', emoji: '🔔', hook: 'From street problems to national promises, one AI-powered, evidence-backed accountability platform.', hookNe: 'सडकका समस्या देखि राष्ट्रिय वाचासम्म, एउटै AI-संचालित, प्रमाण-आधारित जवाफदेहिता प्लेटफर्म।' };

// Status labels in both languages
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
  const format = searchParams.get('format') || 'story';
  const locale = searchParams.get('locale') || 'en';
  const facts = searchParams.get('facts');

  const isNe = locale === 'ne';
  const width = 1080;
  const height = format === 'post' ? 1080 : 1920;
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
  const titleSize = title.length > 80 ? 36 : title.length > 50 ? 44 : 56;

  const factItems = facts ? facts.split('|').slice(0, 4) : [];

  // Localized labels
  const sectionLabel = isNe ? theme.labelNe : theme.label;
  const hookText = isNe ? theme.hookNe : theme.hook;
  const ctaTagline = isNe
    ? 'नागरिक समस्या रिपोर्ट · वाचा ट्र्याक · सत्य प्रमाणित'
    : 'Report civic issues. Track promises. Verify truth.';
  const progressLabel = isNe ? 'प्रगति' : 'PROGRESS';

  // Date stamp
  const today = new Date();
  const dateStr = isNe
    ? `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`
    : today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Section-specific background
  const bgGradient = section === 'corruption'
    ? 'linear-gradient(180deg, #0c0506 0%, #1a0808 25%, #200a0a 50%, #1a0808 75%, #0c0506 100%)'
    : section === 'commitments'
    ? 'linear-gradient(180deg, #060810 0%, #0a1020 30%, #081018 60%, #060810 100%)'
    : 'linear-gradient(180deg, #08080f 0%, #0c1020 25%, #100a18 50%, #0c1020 75%, #08080f 100%)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: bgGradient,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          padding: format === 'post' ? '60px 50px' : '100px 60px',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
            display: 'flex',
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '900px',
            height: '900px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${theme.accent}12 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* ── TOP: Brand + Hook ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {/* Brand + Date row */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '26px' }}>🔔</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    color: BELL_GOLD,
                    display: 'flex',
                  }}
                >
                  {isNe ? 'नेपाल रिपब्लिक' : 'NEPAL REPUBLIC'}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.35)',
                    display: 'flex',
                  }}
                >
                  {dateStr}
                </span>
              </div>
            </div>
          </div>

          {/* Section pill */}
          {sectionLabel ? (
            <div style={{ display: 'flex' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: isNe ? '0.05em' : '0.15em',
                  color: theme.accent,
                  padding: '8px 24px',
                  borderRadius: '100px',
                  background: `${theme.accent}15`,
                  border: `1.5px solid ${theme.accent}35`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{theme.emoji}</span>
                {sectionLabel}
              </span>
            </div>
          ) : null}

          {/* Hook question */}
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic',
              display: 'flex',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            {hookText}
          </div>
        </div>

        {/* ── CENTER: Main content ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '900px',
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: `${titleSize}px`,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle ? (
            <div
              style={{
                fontSize: '24px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
                textAlign: 'center',
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {/* Progress */}
          {progress ? (
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '80px',
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
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '500px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: `${progressNum}%`,
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: statusColor,
                  }}
                >
                  {statusLabel || progressLabel}
                </div>
              </div>
            </div>
          ) : null}

          {/* Status badge (no progress) */}
          {statusLabel && !progress ? (
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  display: 'flex',
                  padding: '12px 32px',
                  borderRadius: '100px',
                  backgroundColor: `${statusColor}18`,
                  border: `1.5px solid ${statusColor}35`,
                  color: statusColor,
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                }}
              >
                {statusLabel}
              </div>
            </div>
          ) : null}

          {/* Context-specific facts */}
          {factItems.length > 0 ? (
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                alignItems: 'center',
              }}
            >
              {factItems.map((fact, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 24px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: theme.accent,
                      display: 'flex',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '19px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                      display: 'flex',
                    }}
                  >
                    {fact.trim()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── BOTTOM: CTA ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* CTA button */}
          <div
            style={{
              display: 'flex',
              padding: '16px 48px',
              borderRadius: '100px',
              background: `linear-gradient(135deg, ${NEPAL_RED}dd, ${NEPAL_BLUE}dd)`,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                display: 'flex',
              }}
            >
              nepalrepublic.org
            </span>
          </div>

          {/* Tagline */}
          <span
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '15px',
              display: 'flex',
              textAlign: 'center',
            }}
          >
            {ctaTagline}
          </span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${NEPAL_RED}80, ${BELL_GOLD}60, ${NEPAL_BLUE}80)`,
            display: 'flex',
          }}
        />
      </div>
    ),
    { width, height },
  );
}
