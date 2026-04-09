'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServiceDocument } from '@/lib/services/types';

/**
 * Document readiness checker — cross-references user's vault
 * against a service's required documents.
 * Shows which docs are ready vs which still need to be uploaded.
 */
export function DocReadiness({
  serviceSlug,
  documents,
}: {
  serviceSlug: string;
  documents: ServiceDocument[];
}) {
  const [vaultDocs, setVaultDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vault/list')
      .then((r) => r.json())
      .then((j) => {
        // Extract doc type keys from vault
        const types = (j.docs || []).map((d: any) => d.doc_type?.toLowerCase() || '');
        setVaultDocs(types);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || documents.length === 0) return null;

  // Map document titles to vault doc types (fuzzy match)
  const matchMap: Record<string, boolean> = {};
  const docKeywords: Record<string, string[]> = {
    citizenship: ['citizenship', 'nagarikta'],
    passport: ['passport', 'rahadani'],
    pan: ['pan'],
    license: ['license', 'licence', 'driving'],
    photo: ['photo', 'photograph', 'passport_photo'],
    birth: ['birth', 'janma'],
    marriage: ['marriage', 'vivah'],
    voter: ['voter', 'matdata'],
    national_id: ['national_id', 'nid', 'rastriya'],
  };

  for (const doc of documents) {
    const titleLower = doc.title.en.toLowerCase();
    let matched = false;

    for (const [vaultType, keywords] of Object.entries(docKeywords)) {
      if (keywords.some((kw) => titleLower.includes(kw))) {
        matched = vaultDocs.some((v) => v.includes(vaultType) || keywords.some((kw) => v.includes(kw)));
        break;
      }
    }

    matchMap[doc.title.en] = matched;
  }

  const readyCount = Object.values(matchMap).filter(Boolean).length;
  const totalRequired = documents.filter((d) => d.required).length;
  const readyRequired = documents.filter((d) => d.required && matchMap[d.title.en]).length;

  return (
    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Document Readiness</h3>
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          readyRequired === totalRequired
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {readyRequired}/{totalRequired} required ready
        </div>
      </div>

      <div className="space-y-2">
        {documents.map((doc, i) => {
          const ready = matchMap[doc.title.en];
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={ready ? 'text-emerald-400' : doc.required ? 'text-red-400' : 'text-zinc-600'}>
                {ready ? '✓' : doc.required ? '✗' : '○'}
              </span>
              <span className={ready ? 'text-zinc-200' : 'text-zinc-400'}>{doc.title.en}</span>
              <span className="text-zinc-600 text-xs">{doc.title.ne}</span>
              {doc.required && !ready && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  missing
                </span>
              )}
              {ready && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  in vault
                </span>
              )}
            </div>
          );
        })}
      </div>

      {readyRequired < totalRequired && (
        <Link
          href="/me/vault"
          className="mt-3 block text-center rounded-xl border border-zinc-700 py-2 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Upload missing documents to your Vault →
        </Link>
      )}

      {readyRequired === totalRequired && (
        <div className="mt-3 text-center text-xs text-emerald-400">
          All required documents are in your vault. You're ready to apply!
        </div>
      )}
    </div>
  );
}
