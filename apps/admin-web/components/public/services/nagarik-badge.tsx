'use client';

import { getNagarikBridge } from '@/lib/services/nagarik-bridge';

/**
 * NagarikBadge — compact "Also on Nagarik" info card on service detail pages.
 *
 * Design principles:
 * - Positioned AFTER our own CTAs, portal links, and execution panels
 * - Subtle (zinc bg, not gradient), informational not promotional
 * - Highlights what WE add on top of what Nagarik offers
 * - Never competes with our own "Apply in-app" CTA
 */
export function NagarikBadge({ serviceSlug }: { serviceSlug: string }) {
  const bridge = getNagarikBridge(serviceSlug);
  if (!bridge) return null;

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-6">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
          <span className="text-sm">📱</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-zinc-300">Also on Nagarik App</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              नागरिक एप
            </span>
          </div>

          {/* What Nagarik offers */}
          <p className="text-xs text-zinc-500 mb-1">{bridge.nagarikCapability.en}</p>

          {/* What we add — the key differentiator */}
          {bridge.ourAdvantage && (
            <p className="text-xs text-zinc-400">
              <span className="text-red-400 font-semibold">Nepal Republic adds:</span>{' '}
              {bridge.ourAdvantage.en}
            </p>
          )}

          {/* Link */}
          <a
            href={bridge.nagarikUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-[11px] text-blue-400/70 hover:text-blue-300 transition-colors"
          >
            nagarikapp.gov.np ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Nagarik badge for service cards / list views.
 */
export function NagarikBadgeCompact({ serviceSlug }: { serviceSlug: string }) {
  const bridge = getNagarikBridge(serviceSlug);
  if (!bridge) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
      title={`Also available on Nagarik App: ${bridge.nagarikLabel.en}`}
    >
      📱 Nagarik
    </span>
  );
}
