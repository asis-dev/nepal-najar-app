'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { promises, type PromiseStatus } from '@/lib/data/promises';

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

function CommitmentEmbedWidgetInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const theme = searchParams.get('theme') === 'light' ? 'light' : 'dark';

  const promise = promises.find((p) => p.slug === id || p.id === id);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0e1a' : '#ffffff';
  const cardBg = isDark ? '#131825' : '#f8f9fa';
  const textPrimary = isDark ? '#f1f5f9' : '#1a1a2e';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const brandRed = '#DC143C';

  if (!promise) {
    return (
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          background: bg,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: textSecondary,
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 8 }}>Commitment not found</div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: brandRed, textDecoration: 'none', fontSize: 12 }}
        >
          Visit Nepal Republic
        </a>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[promise.status];
  const slug = promise.slug || promise.id;

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
      {/* Status accent bar */}
      <div style={{ height: 4, background: statusColor }} />

      <div style={{ padding: '16px 20px' }}>
        {/* Nepali title */}
        {promise.title_ne && (
          <div
            style={{
              fontSize: 14,
              color: textSecondary,
              marginBottom: 4,
              lineHeight: 1.5,
            }}
          >
            {promise.title_ne}
          </div>
        )}

        {/* English title */}
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.4,
            color: textPrimary,
          }}
        >
          {promise.title}
        </h3>

        {/* Status badge */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: statusColor,
              background: `${statusColor}18`,
              padding: '3px 10px',
              borderRadius: 6,
            }}
          >
            {STATUS_LABELS[promise.status]}
          </span>
          <span style={{ fontSize: 12, color: textSecondary }}>
            {promise.category}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, color: textSecondary }}>Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>{promise.progress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              background: `${statusColor}20`,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${promise.progress}%`,
                height: '100%',
                background: statusColor,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* View link */}
        <a
          href={`${SITE_URL}/explore/first-100-days/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: 16,
            padding: '8px 0',
            textAlign: 'center',
            background: cardBg,
            borderRadius: 8,
            color: brandRed,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          View on Nepal Republic &rarr;
        </a>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
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
      </div>
    </div>
  );
}

export function CommitmentEmbedWidget() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 400, padding: 20, textAlign: 'center', color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }}>
          Loading...
        </div>
      }
    >
      <CommitmentEmbedWidgetInner />
    </Suspense>
  );
}
