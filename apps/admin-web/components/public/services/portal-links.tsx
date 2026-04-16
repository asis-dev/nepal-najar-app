'use client';

import { useEffect, useState } from 'react';
import { findPortalsForService, getPaymentLink } from '@/lib/portals/registry';
import { PortalLinkCard } from '@/components/public/services/portal-link-card';
import { getNagarikBridge } from '@/lib/services/nagarik-bridge';
import type { PortalDeepLink } from '@/lib/integrations/portal-deeplinks';

/**
 * PortalLinks — shown on the service detail page.
 *
 * Renders two layers:
 * 1. Smart deep-links (from the PortalLinkCard component, fetched from the API)
 * 2. Fallback basic portal links + payment shortcuts (from the registry directly)
 *
 * If deep-links exist for this service, the smart card is shown prominently.
 * The basic registry links are still shown below for completeness.
 */
export function PortalLinks({ serviceSlug }: { serviceSlug: string }) {
  const [hasDeepLinks, setHasDeepLinks] = useState(false);
  const [checked, setChecked] = useState(false);

  // Exclude Nagarik App from portal list when the NagarikBadge component handles it
  const hasNagarikBridge = !!getNagarikBridge(serviceSlug);
  const portals = findPortalsForService(serviceSlug).filter(
    (p) => !(hasNagarikBridge && p.id === 'nagarik-app'),
  );
  const esewa = getPaymentLink(serviceSlug, 'esewa');
  const khalti = getPaymentLink(serviceSlug, 'khalti');
  const connectips = getPaymentLink(serviceSlug, 'connectips');
  const hasPayment = !!(esewa || khalti || connectips);
  const hasBasicPortals = portals.length > 0;

  // Check if deep-links exist for this service
  useEffect(() => {
    fetch(`/api/services/${serviceSlug}/portal-links`)
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((data) => setHasDeepLinks((data.links || []).length > 0))
      .catch(() => setHasDeepLinks(false))
      .finally(() => setChecked(true));
  }, [serviceSlug]);

  if (!checked) return null;

  // If no deep-links and no basic portals, show nothing
  if (!hasDeepLinks && !hasBasicPortals) return null;

  return (
    <>
      {/* Smart deep-link card */}
      {hasDeepLinks && <PortalLinkCard serviceSlug={serviceSlug} />}

      {/* Basic portal links + payment shortcuts */}
      {hasBasicPortals && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-3">
            {hasDeepLinks ? 'All Portals & Payment' : 'Official Portals & Payment'}
          </h3>
          <div className="space-y-2">
            {portals.map((p) => (
              <a
                key={p.id}
                href={p.action_url || p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-zinc-800/50 border border-zinc-700/50 px-4 py-3 hover:bg-zinc-800 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 group-hover:text-red-400 transition-colors">{p.name_en}</div>
                  <div className="text-xs text-zinc-500">{p.name_ne}</div>
                  <div className="text-[11px] text-zinc-600 mt-0.5">{p.description}</div>
                </div>
                <span className="shrink-0 text-zinc-500 text-xs">&#8599;</span>
              </a>
            ))}
          </div>

          {hasPayment && (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <div className="text-[10px] uppercase text-zinc-500 mb-2">Quick Pay</div>
              <div className="flex flex-wrap gap-2">
                {esewa && (
                  <a href={esewa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-green-600/20 border border-green-600/30 px-3 py-2 text-xs font-semibold text-green-400 hover:bg-green-600/30">
                    eSewa
                  </a>
                )}
                {khalti && (
                  <a href={khalti} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600/20 border border-purple-600/30 px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-600/30">
                    Khalti
                  </a>
                )}
                {connectips && (
                  <a href={connectips} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-600/30 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600/30">
                    ConnectIPS
                  </a>
                )}
              </div>
            </div>
          )}

          {portals.some((p) => p.contact) && (
            <div className="mt-3 pt-2 border-t border-zinc-800">
              <div className="text-[10px] uppercase text-zinc-500 mb-1">Contact</div>
              <div className="flex flex-wrap gap-2">
                {portals.filter((p) => p.contact).map((p) => (
                  <a key={p.id} href={`tel:${p.contact}`} className="text-xs text-zinc-400 hover:text-zinc-200">
                    {p.name_en}: {p.contact}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
