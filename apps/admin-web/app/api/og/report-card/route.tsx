import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { promises, computeStats, formatNPR } from '@/lib/data/promises';
import { computeGhantiScore, shouldShowGrade } from '@/lib/data/ghanti-score';

export const runtime = 'edge';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BG_DARK = '#0a0e1a';

const GOV_START = new Date('2026-03-26T00:00:00+05:45').getTime();
function daysSinceStart(): number {
  return Math.max(0, Math.floor((Date.now() - GOV_START) / (1000 * 60 * 60 * 24)));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') || 'square';
  const locale = searchParams.get('locale') || 'en';
  const isNe = locale === 'ne';
  const isStory = format === 'story';
  const isCard = format === 'card';
  const width = isCard ? 1200 : 1080;
  const height = isStory ? 1920 : isCard ? 630 : 1080;

  const stats = computeStats();
  const withBudget = promises.filter((p) => p.estimatedBudgetNPR != null && p.estimatedBudgetNPR > 0);
  const totalEstimated = withBudget.reduce((s, p) => s + (p.estimatedBudgetNPR ?? 0), 0);
  const totalSpent = withBudget.reduce((s, p) => s + (p.spentNPR ?? 0), 0);

  const gs = computeGhantiScore(promises);
  const showGrade = shouldShowGrade(gs.phase);
  const days = daysSinceStart();

  // Count sources with recent signals (approximate "scanned today")
  const sourcesScanned = 80; // 80+ RSS feeds + YouTube + social sources

  const scoreColor = gs.score >= 60 ? '#10b981' : gs.score >= 40 ? '#f59e0b' : gs.score >= 20 ? '#f97316' : '#ef4444';
  const arcLength = Math.round((gs.score / 100) * 534);

  const dateStr = isNe
    ? `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}`
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const total = stats.total || 1;
  const barW = (n: number) => `${Math.max(2, Math.round((n / total) * 100))}%`;

  const pad = isStory ? '70px 56px' : isCard ? '28px 36px' : '50px';

  const statusRows = [
    { label: isNe ? 'प्रगतिमा' : 'In Progress', count: stats.inProgress, color: '#22d3ee' },
    { label: isNe ? 'सुरु भएको छैन' : 'Not Started', count: stats.notStarted, color: '#6b7280' },
    { label: isNe ? 'रोकिएको' : 'Stalled', count: stats.stalled, color: '#ef4444' },
    { label: isNe ? 'पूरा भयो' : 'Delivered', count: stats.delivered, color: '#10b981' },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width, height, display: 'flex', flexDirection: 'column',
          background: BG_DARK, fontFamily: 'system-ui, sans-serif',
          padding: pad, position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Top accent — NR gradient */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isCard ? 4 : 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})`, display: 'flex' }} />

        {/* ── Brand header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isStory ? 48 : isCard ? 16 : 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: isCard ? 40 : 48, height: isCard ? 40 : 48,
              borderRadius: isCard ? 9 : 11,
              background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
            }}>
              <span style={{ fontSize: isCard ? 14 : 16, fontWeight: 900, color: '#fff' }}>NR</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: isCard ? 17 : 20, fontWeight: 700, color: '#fff' }}>{isNe ? 'नेपाल' : 'Nepal'}</span>
                <span style={{ fontSize: isCard ? 17 : 20, fontWeight: 800, color: NEPAL_RED }}>{isNe ? 'रिपब्लिक' : 'Republic'}</span>
              </div>
              <span style={{ fontSize: isCard ? 10 : 12, color: '#6b7280', letterSpacing: 1.5, fontWeight: 600 }}>
                {isNe ? 'सरकारी रिपोर्ट कार्ड' : 'GOVERNMENT REPORT CARD'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: isCard ? 13 : 15, color: '#9ca3af' }}>{dateStr}</span>
            <span style={{
              fontSize: isCard ? 14 : 16, fontWeight: 700,
              color: '#3b82f6', marginTop: 2,
            }}>
              {isNe ? `दिन ${days}` : `Day ${days}`}
            </span>
          </div>
        </div>

        {/* ── Score section ── */}
        <div style={{ display: 'flex', alignItems: isCard ? 'center' : 'center', gap: isCard ? 24 : 32, marginBottom: isStory ? 40 : isCard ? 16 : 32 }}>
          {/* Score circle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: isCard ? 140 : 200, height: isCard ? 140 : 200, position: 'relative', flexShrink: 0 }}>
            <svg width={isCard ? 140 : 200} height={isCard ? 140 : 200} viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={isCard ? 12 : 14} />
              <circle cx="100" cy="100" r="85" fill="none" stroke={scoreColor} strokeWidth={isCard ? 12 : 14} strokeLinecap="round" strokeDasharray={`${arcLength} 534`} transform="rotate(-90 100 100)" />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: isCard ? 42 : 56, fontWeight: 900, color: '#fff', display: 'flex' }}>{gs.score}</span>
              <span style={{ fontSize: isCard ? 12 : 14, color: '#6b7280', display: 'flex' }}>/100</span>
            </div>
          </div>

          {/* Grade or Phase label + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isCard ? 10 : 14, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {showGrade ? (
                <div style={{
                  width: isCard ? 56 : 68, height: isCard ? 56 : 68, borderRadius: 16,
                  background: `${scoreColor}15`, border: `3px solid ${scoreColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: isCard ? 36 : 44, fontWeight: 900, color: scoreColor }}>{gs.grade}</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: isCard ? '10px 18px' : '14px 24px', borderRadius: 14,
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  <span style={{ fontSize: isCard ? 13 : 16, fontWeight: 700, color: '#3b82f6' }}>
                    {isNe ? gs.phaseLabel.ne : gs.phaseLabel.en}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: isCard ? 18 : 22, fontWeight: 700, color: '#fff' }}>
                  {showGrade
                    ? (isNe ? 'रिपब्लिक स्कोर' : 'Republic Score')
                    : (isNe ? 'ट्र्याकिंग सुरु' : 'Tracking Started')}
                </span>
                <span style={{ fontSize: isCard ? 13 : 15, color: '#9ca3af' }}>
                  {isNe ? `${stats.total} प्रतिबद्धता ट्र्याक` : `${stats.total} commitments tracked`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', display: 'flex' }} />
              <span style={{ fontSize: isCard ? 13 : 15, color: '#9ca3af', fontWeight: 500 }}>
                {isNe ? `${sourcesScanned}+ स्रोत स्क्यान` : `${sourcesScanned}+ sources scanned`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Status breakdown ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCard ? 8 : 12, marginBottom: isStory ? 36 : isCard ? 14 : 28 }}>
          {/* Segmented bar */}
          <div style={{ display: 'flex', width: '100%', height: isCard ? 20 : 26, borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ width: barW(stats.delivered), height: '100%', backgroundColor: '#10b981', display: 'flex' }} />
            <div style={{ width: barW(stats.inProgress), height: '100%', backgroundColor: '#22d3ee', display: 'flex' }} />
            <div style={{ width: barW(stats.notStarted), height: '100%', backgroundColor: '#374151', display: 'flex' }} />
            <div style={{ width: barW(stats.stalled), height: '100%', backgroundColor: '#ef4444', display: 'flex' }} />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {statusRows.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, display: 'flex' }} />
                <span style={{ fontSize: isCard ? 12 : 14, color: '#9ca3af' }}>{s.label}</span>
                <span style={{ fontSize: isCard ? 15 : 18, fontWeight: 700, color: s.color }}>{String(s.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Key metrics ── */}
        <div style={{ display: 'flex', gap: isCard ? 10 : 14, marginBottom: isStory ? 36 : isCard ? 14 : 28 }}>
          {[
            { label: isNe ? 'डेलिभरी दर' : 'DELIVERY', value: `${stats.deliveryRate}%`, color: '#10b981' },
            { label: isNe ? 'औसत प्रगति' : 'PROGRESS', value: `${stats.avgProgress}%`, color: '#3b82f6' },
            { label: isNe ? 'विश्वास स्कोर' : 'TRUST', value: `${gs.subScores.trustScore}%`, color: '#8b5cf6' },
            { label: isNe ? 'बजेट' : 'BUDGET', value: `${gs.subScores.budgetUtilization}%`, color: '#f59e0b' },
          ].map((m, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: isCard ? '14px 10px' : '20px 16px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: isCard ? 10 : 12, color: '#6b7280', letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>{m.label}</span>
              <span style={{ fontSize: isCard ? 26 : 34, fontWeight: 800, color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* ── Budget bar (story/square only) ── */}
        {!isCard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280', letterSpacing: 1.5, fontWeight: 600 }}>{isNe ? 'बजेट उपयोग' : 'BUDGET UTILIZATION'}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{String(gs.subScores.budgetUtilization)}%</span>
            </div>
            <div style={{ display: 'flex', width: '100%', height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div style={{ width: `${Math.max(1, gs.subScores.budgetUtilization)}%`, height: 14, borderRadius: 7, backgroundColor: '#f59e0b', display: 'flex' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{isNe ? 'खर्च' : 'Spent'}: {formatNPR(totalSpent)}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{isNe ? 'विनियोजित' : 'Allocated'}: {formatNPR(totalEstimated)}</span>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ display: 'flex', flex: 1 }} />

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: isCard ? 14 : 16, color: '#6b7280', fontWeight: 500 }}>nepalrepublic.org</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: isCard ? '8px 18px' : '12px 28px', borderRadius: 24,
            background: `linear-gradient(135deg, ${NEPAL_RED}20, ${NEPAL_BLUE}20)`,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: isCard ? 12 : 14, fontWeight: 700, color: '#e5e7eb', letterSpacing: 1.5 }}>
              {isNe ? 'जवाफदेहिता ट्र्याक गर्नुहोस्' : 'TRACK ACCOUNTABILITY'}
            </span>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCard ? 3 : 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})`, display: 'flex' }} />
      </div>
    ),
    {
      width, height,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    },
  );
}
