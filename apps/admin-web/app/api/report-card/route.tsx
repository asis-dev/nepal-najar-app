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

  // Najar Index (simplified for Edge)
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

  const scoreColor = najarScore >= 60 ? '#3b82f6' : najarScore >= 40 ? '#f59e0b' : '#ef4444';
  const arcLength = Math.round((najarScore / 100) * 534);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0e1a',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: 'rgba(59,130,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
              }}
            >
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa' }}>N</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.2em', color: '#60a5fa' }}>
                NEPAL NAJAR
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                Weekly Governance Report
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{dateRange}</span>
          </div>
        </div>

        {/* Score section */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}>
          {/* Score circle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '200px', height: '200px', position: 'relative' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" />
              <circle
                cx="100" cy="100" r="85" fill="none"
                stroke={scoreColor}
                stroke-width="12"
                stroke-linecap="round"
                stroke-dasharray={`${arcLength} 534`}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '56px', fontWeight: 800, color: 'white' }}>{najarScore}</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>/100</span>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '48px', flex: 1 }}>
            <div style={{ display: 'flex', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em' }}>
                {String(stats.total)} PROMISES TRACKED
              </span>
            </div>
            {/* Delivered */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '12px' }} />
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', width: '120px' }}>Delivered</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{String(stats.delivered)}</span>
            </div>
            {/* In Progress */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', marginRight: '12px' }} />
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', width: '120px' }}>In Progress</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{String(stats.inProgress)}</span>
            </div>
            {/* Not Started */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6b7280', marginRight: '12px' }} />
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', width: '120px' }}>Not Started</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#6b7280' }}>{String(stats.notStarted)}</span>
            </div>
            {/* Stalled */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', marginRight: '12px' }} />
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', width: '120px' }}>Stalled</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{String(stats.stalled)}</span>
            </div>
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em' }}>
              BUDGET UTILIZATION
            </span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>{String(budgetUtil)}%</span>
          </div>
          <div style={{ display: 'flex', width: '100%', height: '14px', borderRadius: '7px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div
              style={{
                width: `${budgetUtil}%`,
                height: '14px',
                borderRadius: '7px',
                backgroundColor: '#f59e0b',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              {`Spent: ${formatNPR(totalSpent)}`}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              {`Allocated: ${formatNPR(totalEstimated)}`}
            </span>
          </div>
        </div>

        {/* Key metrics row */}
        <div style={{ display: 'flex', marginBottom: '40px' }}>
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              marginRight: '16px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>DELIVERY RATE</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{String(stats.deliveryRate)}%</span>
          </div>
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              marginRight: '16px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>AVG PROGRESS</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{String(stats.avgProgress)}%</span>
          </div>
          <div
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>TRUST SCORE</span>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#8b5cf6' }}>{String(trustScore)}%</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '60px',
            right: '60px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>nepalnajar.com</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>Nepal Najar - Weekly Report</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
