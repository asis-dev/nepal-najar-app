'use client';

import { Swords, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useConflicts } from '@/lib/hooks/use-conflicts';
import { PublicPageHero } from '@/components/public/page-hero';
import { ConflictCard } from '@/components/public/disputed/conflict-card';

export default function DisputedPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const { data, isLoading } = useConflicts(30);
  const conflicts = data?.conflicts ?? [];
  const totalDisputed = data?.total_disputed ?? 0;

  return (
    <>
      <PublicPageHero
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5" />
            {t('disputes.eyebrow')}
          </span>
        }
        title={t('disputes.title')}
        description={t('disputes.description')}
        stats={
          totalDisputed > 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/15">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-sm text-red-400 font-medium">
                {totalDisputed} {t('disputes.conflictingEvidence')}
              </span>
            </div>
          ) : null
        }
      />

      <section className="public-section">
        <div className="public-shell">
          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-4 bg-white/[0.04] rounded w-20 mb-3" />
                  <div className="h-5 bg-white/[0.04] rounded w-3/4 mb-4" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-24 bg-white/[0.04] rounded" />
                    <div className="h-24 bg-white/[0.04] rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && conflicts.length === 0 && (
            <div className="text-center py-16">
              <Swords className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                {t('disputes.noDisputesTitle')}
              </p>
              <p className="text-xs text-gray-600">
                {t('disputes.noDisputesDesc')}
              </p>
            </div>
          )}

          {/* Conflict cards */}
          {!isLoading && conflicts.length > 0 && (
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <ConflictCard key={conflict.promise_id} conflict={conflict} />
              ))}
            </div>
          )}

          {/* Explainer */}
          {!isLoading && conflicts.length > 0 && (
            <details className="mt-8 glass-card">
              <summary className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                {t('disputes.howThisWorks')}
              </summary>
              <div className="px-4 pb-4 text-xs text-gray-600 space-y-2">
                <p>
                  {t('disputes.howThisWorksP1')}
                </p>
                <p>
                  {t('disputes.howThisWorksP2')}
                </p>
                <p className="text-gray-700">
                  {t('disputes.howThisWorksP3')}
                </p>
              </div>
            </details>
          )}
        </div>
      </section>
    </>
  );
}
