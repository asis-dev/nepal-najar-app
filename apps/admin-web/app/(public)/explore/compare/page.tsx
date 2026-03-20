'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  X,
  BarChart3,
  Shield,
  FileText,
  Wallet,
  Building2,
  Scale,
  Zap,
  Train,
  Cpu,
  Heart,
  GraduationCap,
  Leaf,
  Coins,
  Users,
} from 'lucide-react';
import { promises as allPromises, type PromiseStatus, type PromiseCategory, type TrustLevel, formatNPR } from '@/lib/data/promises';
import { useComparisonStore } from '@/lib/stores/comparison';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const statusStyleConfig: Record<PromiseStatus, { bg: string; text: string; dot: string; label: string; label_ne: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400', label: 'Not Started', label_ne: 'सुरु भएको छैन' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', label: 'In Progress', label_ne: 'प्रगतिमा' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Delivered', label_ne: 'सम्पन्न' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', label: 'Stalled', label_ne: 'रोकिएको' },
};

const trustStyleConfig: Record<TrustLevel, { text: string; label: string }> = {
  verified: { text: 'text-emerald-400', label: 'Verified' },
  partial: { text: 'text-yellow-400', label: 'Partial' },
  unverified: { text: 'text-gray-400', label: 'Unverified' },
  disputed: { text: 'text-red-400', label: 'Disputed' },
};

const categoryIcons: Record<PromiseCategory, typeof Building2> = {
  Governance: Building2,
  'Anti-Corruption': Shield,
  Infrastructure: Building2,
  Transport: Train,
  Energy: Zap,
  Technology: Cpu,
  Health: Heart,
  Education: GraduationCap,
  Environment: Leaf,
  Economy: Coins,
  Social: Users,
};

const categoryColors: Record<PromiseCategory, string> = {
  Governance: 'text-violet-400',
  'Anti-Corruption': 'text-rose-400',
  Infrastructure: 'text-amber-400',
  Transport: 'text-sky-400',
  Energy: 'text-yellow-400',
  Technology: 'text-cyan-400',
  Health: 'text-pink-400',
  Education: 'text-indigo-400',
  Environment: 'text-emerald-400',
  Economy: 'text-orange-400',
  Social: 'text-teal-400',
};

/* ═══════════════════════════════════════════════
   COMPARE PAGE INNER (needs useSearchParams)
   ═══════════════════════════════════════════════ */
function ComparePageInner() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const removeFromComparison = useComparisonStore((s) => s.removeFromComparison);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useComparisonStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').filter(Boolean);
  const promises = ids
    .map((id) => allPromises.find((p) => p.id === id || p.slug === id))
    .filter(Boolean);

  const isNe = locale === 'ne';

  const handleRemove = (id: string) => {
    removeFromComparison(id);
    // Update URL without full reload
    const newIds = ids.filter((x) => x !== id);
    const url = newIds.length > 0
      ? `/explore/compare?ids=${newIds.join(',')}`
      : '/explore/compare';
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-gray-400">
        <Link href="/" className="hover:text-white transition-colors">
          {isNe ? 'गृहपृष्ठ' : 'Home'}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/explore" className="hover:text-white transition-colors">
          {isNe ? 'अन्वेषण' : 'Explore'}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{isNe ? 'तुलना' : 'Compare'}</span>
      </nav>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
        {isNe ? 'प्रतिज्ञा तुलना' : 'Compare Promises'}
      </h1>
      <p className="mb-8 text-gray-400">
        {isNe ? 'चयन गरिएका प्रतिज्ञाहरूको साथसाथै तुलना' : 'Side-by-side comparison of selected promises'}
      </p>

      {/* Empty state */}
      {promises.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-8 py-16 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-gray-500" />
          <h2 className="mb-2 text-lg font-semibold text-white">
            {isNe ? 'कुनै प्रतिज्ञा चयन भएको छैन' : 'No promises selected'}
          </h2>
          <p className="mb-6 max-w-md text-gray-400">
            {isNe
              ? 'अन्वेषण पृष्ठबाट ४ वटासम्म प्रतिज्ञाहरू चयन गर्नुहोस्।'
              : 'Select up to 4 promises from the explore page to compare them side by side.'}
          </p>
          <Link
            href="/explore"
            className="glass-card glass-card-hover rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all"
          >
            {isNe ? 'प्रतिज्ञाहरू हेर्नुहोस्' : 'Browse Promises'}
          </Link>
        </div>
      )}

      {/* Comparison grid */}
      {hydrated && promises.length > 0 && (
        <div className={`grid gap-4 ${
          promises.length === 1
            ? 'grid-cols-1 max-w-md'
            : promises.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : promises.length === 3
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {promises.map((promise) => {
            if (!promise) return null;
            const style = statusStyleConfig[promise.status];
            const trust = trustStyleConfig[promise.trustLevel];
            const CatIcon = categoryIcons[promise.category] ?? Building2;
            const catColor = categoryColors[promise.category] ?? 'text-gray-400';

            return (
              <div
                key={promise.id}
                className="glass-card group relative flex flex-col rounded-2xl p-5"
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(promise.id)}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Remove from comparison"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Category */}
                <div className="mb-3 flex items-center gap-2">
                  <CatIcon className={`h-4 w-4 ${catColor}`} />
                  <span className={`text-xs font-medium ${catColor}`}>
                    {isNe ? promise.category_ne : promise.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-1 text-base font-semibold text-white leading-snug">
                  {isNe ? promise.title_ne : promise.title}
                </h3>
                <p className="mb-4 text-xs text-gray-500">
                  {isNe ? promise.title : promise.title_ne}
                </p>

                {/* Status badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {isNe ? style.label_ne : style.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-400">{isNe ? 'प्रगति' : 'Progress'}</span>
                    <span className="font-mono text-white">{promise.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        promise.progress >= 100
                          ? 'bg-emerald-500'
                          : promise.progress >= 50
                            ? 'bg-blue-500'
                            : promise.progress > 0
                              ? 'bg-amber-500'
                              : 'bg-gray-600'
                      }`}
                      style={{ width: `${Math.min(promise.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats rows */}
                <div className="mt-auto space-y-2.5 border-t border-white/5 pt-4">
                  {/* Trust level */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Shield className="h-3 w-3" />
                      {isNe ? 'विश्वसनीयता' : 'Trust'}
                    </span>
                    <span className={`font-medium ${trust.text}`}>{trust.label}</span>
                  </div>

                  {/* Evidence count */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <FileText className="h-3 w-3" />
                      {isNe ? 'प्रमाण' : 'Evidence'}
                    </span>
                    <span className="font-mono text-white">{promise.evidenceCount}</span>
                  </div>

                  {/* Budget */}
                  {promise.estimatedBudgetNPR != null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Wallet className="h-3 w-3" />
                        {isNe ? 'बजेट' : 'Budget'}
                      </span>
                      <span className="font-mono text-white">
                        {formatNPR(promise.estimatedBudgetNPR)}
                      </span>
                    </div>
                  )}

                  {/* Deadline */}
                  {promise.deadline && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Scale className="h-3 w-3" />
                        {isNe ? 'म्याद' : 'Deadline'}
                      </span>
                      <span className="font-mono text-white">{promise.deadline}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE EXPORT (Suspense boundary for useSearchParams)
   ═══════════════════════════════════════════════ */
export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <ComparePageInner />
    </Suspense>
  );
}
