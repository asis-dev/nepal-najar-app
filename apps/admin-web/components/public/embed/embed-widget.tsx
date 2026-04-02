'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { promises, computeStats, type GovernmentPromise, type PromiseStatus } from '@/lib/data/promises';
import { computeGhantiScore } from '@/lib/data/ghanti-score';

const SITE_URL = 'https://nepalrepublic.org';

const STATUS_LABELS: Record<PromiseStatus, string> = {
  delivered: 'Delivered',
  in_progress: 'In Progress',
  stalled: 'Stalled',
  not_started: 'Not Started',
};

const STATUS_COLORS: Record<PromiseStatus, string> = {
  delivered: '#22c55e',
  in_progress: '#3b82f6',
  stalled: '#ef4444',
  not_started: '#6b7280',
};

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};

function EmbedWidgetInner() {
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';
  const count = Math.min(Math.max(parseInt(searchParams.get('count') || '5', 10) || 5, 1), 20);
  const statusFilter = searchParams.get('status') as PromiseStatus | null;
  const compact = searchParams.get('compact') === 'true';

  const stats = computeStats();
  const score = computeGhantiScore();

  let filtered = [...promises];
  if (statusFilter && STATUS_LABELS[statusFilter]) {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }

  // Sort by most recent update
  filtered.sort((a, b) => {
    const dateA = a.lastActivityDate || a.lastUpdate || '2000-01-01';
    const dateB = b.lastActivityDate || b.lastUpdate || '2000-01-01';
    return dateB.localeCompare(dateA);
  });

  const displayed = filtered.slice(0, count);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0e1a' : '#ffffff';
  const cardBg = isDark ? '#131825' : '#f8f9fa';
  const textPrimary = isDark ? '#f1f5f9' : '#1a1a2e';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const brandRed = '#DC143C';
  const brandBlue = '#003893';

  return (
    <div
      style={{
        maxWidth: 400,
        width: '100%',
        background: bg,
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: textPrimary,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: compact ? '12px 16px' : '16px 20px',
          background: `linear-gradient(135deg, ${brandRed}, ${brandBlue})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: compact ? 14 : 16,
            letterSpacing: '-0.01em',
          }}
        >
          Nepal Republic
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {score.dataConfidence !== 'insufficient' && (
            <>
              <span
                style={{
                  color: '#ffffff',
                  fontSize: compact ? 12 : 13,
                  opacity: 0.85,
                }}
              >
                Republic Score
              </span>
              <span
                style={{
                  background: GRADE_COLORS[score.grade] || '#6b7280',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: compact ? 13 : 15,
                  padding: '2px 8px',
                  borderRadius: 6,
                  lineHeight: 1.3,
                }}
              >
                {score.grade}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '10px 16px',
            borderBottom: `1px solid ${borderColor}`,
            fontSize: 12,
            color: textSecondary,
          }}
        >
          <StatItem color="#22c55e" label="Delivered" value={stats.delivered} />
          <StatItem color="#3b82f6" label="In Progress" value={stats.inProgress} />
          <StatItem color="#ef4444" label="Stalled" value={stats.stalled} />
          <StatItem color="#6b7280" label="Not Started" value={stats.notStarted} />
        </div>
      )}

      {/* Commitment list */}
      <div style={{ padding: compact ? '8px 12px' : '12px 16px' }}>
        {displayed.map((p, i) => (
          <CommitmentRow
            key={p.id}
            promise={p}
            cardBg={cardBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            borderColor={borderColor}
            compact={compact}
            isLast={i === displayed.length - 1}
          />
        ))}
        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: textSecondary, fontSize: 13 }}>
            No commitments found
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: `1px solid ${borderColor}`,
          textAlign: 'center',
          fontSize: 11,
          color: textSecondary,
        }}
      >
        Powered by{' '}
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: brandRed, textDecoration: 'none', fontWeight: 600 }}
        >
          Nepal Republic
        </a>
        {' '}&middot;{' '}
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: textSecondary, textDecoration: 'none' }}
        >
          nepalrepublic.org
        </a>
      </div>
    </div>
  );
}

function StatItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span>
        <strong style={{ color }}>{value}</strong> {label}
      </span>
    </div>
  );
}

function CommitmentRow({
  promise,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
  compact,
  isLast,
}: {
  promise: GovernmentPromise;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  compact: boolean;
  isLast: boolean;
}) {
  const statusColor = STATUS_COLORS[promise.status];
  const slug = promise.slug || promise.id;

  return (
    <a
      href={`${SITE_URL}/explore/first-100-days/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: textPrimary,
        background: cardBg,
        borderRadius: 8,
        padding: compact ? '8px 10px' : '10px 14px',
        marginBottom: isLast ? 0 : 8,
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: compact ? 12 : 13,
            fontWeight: 500,
            lineHeight: 1.4,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {promise.title}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            background: `${statusColor}18`,
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {STATUS_LABELS[promise.status]}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            background: `${statusColor}20`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${promise.progress}%`,
              height: '100%',
              background: statusColor,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: textSecondary, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
          {promise.progress}%
        </span>
      </div>
    </a>
  );
}

export function EmbedWidget() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 400, padding: 20, textAlign: 'center', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
          Loading...
        </div>
      }
    >
      <EmbedWidgetInner />
    </Suspense>
  );
}
