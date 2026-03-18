import { ImageResponse } from 'next/og';
import { promises, computeStats, formatNPR } from '@/lib/data/promises';

export const runtime = 'edge';

export async function GET() {
  const stats = computeStats();

  // Budget aggregates
  const withBudget = promises.filter((p) => p.estimatedBudgetNPR != null && p.estimatedBudgetNPR > 0);
  const totalEstimated = withBudget.reduce((s, p) => s + (p.estimatedBudgetNPR ?? 0), 0);
  const totalSpent = withBudget.reduce((s, p) => s + (p.spentNPR ?? 0), 0);
  const budgetUtil = totalEstimated > 0 ? Math.round((totalSpent / totalEstimated) * 100) : 0;

  // Najar Index (simplified for Edge — no import of full module to keep bundle small)
  const trustScore = Math.round(
    promises.reduce((s, p) => s + (p.trustLevel === 'verified' ? 100 : p.trustLevel === 'partial' ? 50 : 0), 0) / promises.length,
  );
  const najarScore = Math.round(
    0.25 * stats.deliveryRate + 0.30 * stats.avgProgress + 0.15 * trustScore + 0.20 * budgetUtil + 0.10 * 62,
  );

  // Date range
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const statItems = [
    { label: 'Delivered', value: stats.delivered, color: '#10b981', dot: '#10b981' },
    { label: 'In Progress', value: stats.inProgress, color: '#3b82f6', dot: '#3b82f6' },
    { label: 'Not Started', value: stats.notStarted, color: '#6b7280', dot: '#6b7280' },
    { label: 'Stalled', value: stats.stalled, color: '#ef4444', dot: '#ef4444' },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #0a0e1a 0%, #0f1629 40%, #0c1220 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* Ambient glows */}
        <div
          style={{
            position: 'absolute', top: '-150px', left: '30%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: '-100px', right: '20%',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(59,130,246,0.25)',
              }}
            >
              <span style={{ fontSize: '28px' }}>🏔️</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.2em', color: '#60a5fa', textTransform: 'uppercase' as const }}>
                NEPAL NAJAR
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                Weekly Governance Report
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{dateRange}</span>
          </div>
        </div>

        {/* Score section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px', marginBottom: '48px', position: 'relative', zIndex: 10 }}>
          {/* Score circle */}
          <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle
                cx="100" cy="100" r="85" fill="none"
                stroke={najarScore >= 60 ? '#3b82f6' : najarScore >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(najarScore / 100) * 534} 534`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '56px', fontWeight: 800, color: 'white', lineHeight: 1 }}>{najarScore}</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/100</span>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              <span>{stats.total} PROMISES TRACKED</span>
            </div>
            {statItems.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.dot }} />
                <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', width: '120px' }}>{item.label}</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '48px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              BUDGET UTILIZATION
            </span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{budgetUtil}%</span>
          </div>
          <div style={{ display: 'flex', width: '100%', height: '14px', borderRadius: '7px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${budgetUtil}%`, height: '100%', borderRadius: '7px',
                background: 'linear-gradient(90deg, #f59e0b, #eab308)',
                boxShadow: '0 0 12px rgba(245,158,11,0.4)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Spent: {formatNPR(totalSpent)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Allocated: {formatNPR(totalEstimated)}
            </span>
          </div>
        </div>

        {/* Key metrics row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
          {[
            { label: 'Delivery Rate', value: `${stats.deliveryRate}%`, color: '#10b981' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: '#3b82f6' },
            { label: 'Trust Score', value: `${trustScore}%`, color: '#8b5cf6' },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                flex: 1, padding: '16px 20px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{metric.label}</span>
              <span style={{ fontSize: '28px', fontWeight: 700, color: metric.color }}>{metric.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute', bottom: '30px', left: '60px', right: '60px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>nepalnajar.com</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>जनताको नजरमा बालेनको नेपाल</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
