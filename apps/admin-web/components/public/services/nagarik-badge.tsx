'use client';

import { getNagarikBridge } from '@/lib/services/nagarik-bridge';

/**
 * NagarikBadge — "Also available on Nagarik App" card shown on service detail pages.
 * Links to the Nagarik App/website and highlights what Nepal Republic adds on top.
 */
export function NagarikBadge({ serviceSlug }: { serviceSlug: string }) {
  const bridge = getNagarikBridge(serviceSlug);
  if (!bridge) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/30 p-5 mb-6">
      <div className="flex items-start gap-4">
        {/* Nagarik App icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <span className="text-2xl">📱</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-blue-300">Also on Nagarik App</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              नागरिक एप
            </span>
          </div>

          {/* What Nagarik offers */}
          <p className="text-sm text-zinc-300 mb-1">{bridge.nagarikCapability.en}</p>
          <p className="text-xs text-zinc-500 mb-3">{bridge.nagarikCapability.ne}</p>

          {/* Our advantage */}
          {bridge.ourAdvantage && (
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-700/50 p-3 mb-3">
              <div className="text-[10px] uppercase tracking-wide text-red-400 font-bold mb-1">
                Nepal Republic adds
              </div>
              <p className="text-xs text-zinc-300">{bridge.ourAdvantage.en}</p>
              <p className="text-[11px] text-zinc-500">{bridge.ourAdvantage.ne}</p>
            </div>
          )}

          {/* CTA */}
          <a
            href={bridge.nagarikUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open on Nagarik App ↗
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
