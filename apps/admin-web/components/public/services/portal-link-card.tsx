'use client';

import { useEffect, useState } from 'react';
import type { PortalDeepLink } from '@/lib/integrations/portal-deeplinks';
import { ACTION_LABELS } from '@/lib/integrations/portal-deeplinks';

interface PortalLinkCardProps {
  serviceSlug: string;
  formData?: Record<string, any>;
  /** Compact mode for embedding inside task views */
  compact?: boolean;
}

export function PortalLinkCard({ serviceSlug, formData, compact = false }: PortalLinkCardProps) {
  const [links, setLinks] = useState<PortalDeepLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (formData && Object.keys(formData).length > 0) {
      params.set('formData', JSON.stringify(formData));
    }
    const qs = params.toString();
    fetch(`/api/services/${serviceSlug}/portal-links${qs ? `?${qs}` : ''}`)
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((data) => setLinks(data.links || []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [serviceSlug, formData]);

  if (loading || links.length === 0) return null;

  if (compact) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mt-4">
        <div className="text-xs uppercase tracking-wide font-bold text-blue-300 mb-2">
          Next step: Continue on government portal
        </div>
        <div className="space-y-2">
          {links.map((link) => (
            <CompactLink key={link.portalId + link.action} link={link} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-zinc-900 to-zinc-950 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Government Portal Links</h3>
          <p className="text-xs text-zinc-500">सरकारी पोर्टल लिंकहरू</p>
        </div>
      </div>

      <div className="space-y-3">
        {links.map((link) => (
          <FullLink key={link.portalId + link.action} link={link} />
        ))}
      </div>
    </div>
  );
}

function FullLink({ link }: { link: PortalDeepLink }) {
  const actionLabel = ACTION_LABELS[link.action];
  const href = link.preFilledUrl || link.url;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-100">{link.portalName}</div>
          {link.portalNameNe && (
            <div className="text-xs text-zinc-500">{link.portalNameNe}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {link.requiresLogin && (
            <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              Login required
            </span>
          )}
          {link.preFilledUrl && (
            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Pre-filled
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-zinc-400 mb-3">{link.instructions}</div>
      <div className="text-xs text-zinc-600 mb-4">{link.instructionsNe}</div>

      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <span>{actionLabel.en}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path
              fillRule="evenodd"
              d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </a>
        {link.contact && (
          <a
            href={`tel:${link.contact}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Helpline: {link.contact}
          </a>
        )}
      </div>
    </div>
  );
}

function CompactLink({ link }: { link: PortalDeepLink }) {
  const actionLabel = ACTION_LABELS[link.action];
  const href = link.preFilledUrl || link.url;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 hover:border-blue-500/30 hover:bg-zinc-900 transition-colors group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 group-hover:text-blue-400 transition-colors">
            {actionLabel.en} — {link.portalName}
          </span>
          {link.preFilledUrl && (
            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
              Pre-filled
            </span>
          )}
          {link.requiresLogin && (
            <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-300">
              Login
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{link.instructions}</div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0 text-zinc-600 group-hover:text-blue-400 ml-2">
        <path
          fillRule="evenodd"
          d="M4.22 11.78a.75.75 0 010-1.06L9.44 5.5H5.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 01-1.06 0z"
          clipRule="evenodd"
        />
      </svg>
    </a>
  );
}
