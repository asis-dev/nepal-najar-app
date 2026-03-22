'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Loader2,
  LogIn,
  ChevronDown,
  Megaphone,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useCreateProposal, type ProposalCategory } from '@/lib/hooks/use-proposals';
import { NEPAL_PROVINCES } from '@/lib/stores/preferences';

const CATEGORIES: ProposalCategory[] = [
  'infrastructure', 'health', 'education', 'environment', 'transport',
  'technology', 'water_sanitation', 'agriculture', 'tourism', 'governance',
  'social', 'energy', 'other',
];

export default function CreateProposalPage() {
  const { t, locale } = useI18n();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const isNe = locale === 'ne';

  const createMutation = useCreateProposal();

  // Form state
  const [title, setTitle] = useState('');
  const [titleNe, setTitleNe] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionNe, setDescriptionNe] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('infrastructure');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [relatedPromiseSearch, setRelatedPromiseSearch] = useState('');
  const [relatedPromiseIds, setRelatedPromiseIds] = useState<string[]>([]);

  // Districts for selected province
  const selectedProvinceData = useMemo(
    () => NEPAL_PROVINCES.find((p) => p.name === province),
    [province],
  );

  const isValid = title.trim().length >= 5 && description.trim().length >= 20 && province;

  const handleSubmit = async () => {
    if (!isValid) return;

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        title_ne: titleNe.trim() || undefined,
        description: description.trim(),
        description_ne: descriptionNe.trim() || undefined,
        category,
        province,
        district: district || undefined,
        municipality: municipality || undefined,
        related_promise_ids: relatedPromiseIds.length > 0 ? relatedPromiseIds : undefined,
        estimated_cost_npr: estimatedCost ? parseInt(estimatedCost) : undefined,
      });
      router.push(`/proposals/${result.id}`);
    } catch {
      // Error is handled by mutation state
    }
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="public-page">
        <div className="relative z-10 public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-lg">
              <div className="glass-card p-12 text-center">
                <LogIn className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {t('proposals.signInRequired')}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('proposals.signInToPropose')}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t('proposals.signIn')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('proposals.backToList')}
            </Link>
          </div>
        </div>

        {/* Header */}
        <section className="public-section pb-0 pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <Megaphone className="w-7 h-7 text-primary-400" />
                {t('proposals.createTitle')}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {t('proposals.createSubtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl space-y-5">
              {/* Title (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.title')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('proposals.form.titlePlaceholder')}
                  maxLength={200}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
                <p className="text-[10px] text-gray-600 mt-1">{title.length}/200</p>
              </div>

              {/* Title (Nepali) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.titleNe')}
                </label>
                <input
                  type="text"
                  value={titleNe}
                  onChange={(e) => setTitleNe(e.target.value)}
                  placeholder={t('proposals.form.titleNePlaceholder')}
                  maxLength={200}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.description')} *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('proposals.form.descriptionPlaceholder')}
                  maxLength={5000}
                  rows={5}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
                />
                <p className="text-[10px] text-gray-600 mt-1">{description.length}/5000</p>
              </div>

              {/* Description (Nepali) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.descriptionNe')}
                </label>
                <textarea
                  value={descriptionNe}
                  onChange={(e) => setDescriptionNe(e.target.value)}
                  placeholder={t('proposals.form.descriptionNePlaceholder')}
                  maxLength={5000}
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.category')} *
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProposalCategory)}
                    className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/40 transition-all"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(`proposals.categories.${cat}`)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Location: Province */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('proposals.form.province')} *
                  </label>
                  <div className="relative">
                    <select
                      value={province}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setDistrict('');
                        setMunicipality('');
                      }}
                      className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/40 transition-all"
                    >
                      <option value="">{t('proposals.form.selectProvince')}</option>
                      {NEPAL_PROVINCES.map((p) => (
                        <option key={p.name} value={p.name}>
                          {isNe ? p.name_ne : p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('proposals.form.district')}
                  </label>
                  <div className="relative">
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      disabled={!province}
                      className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/40 transition-all disabled:opacity-40"
                    >
                      <option value="">{t('proposals.form.selectDistrict')}</option>
                      {selectedProvinceData?.districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Municipality */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('proposals.form.municipality')}
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder={t('proposals.form.municipalityPlaceholder')}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Related Promises */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.relatedPromises')}
                </label>
                <input
                  type="text"
                  value={relatedPromiseSearch}
                  onChange={(e) => setRelatedPromiseSearch(e.target.value)}
                  placeholder={t('proposals.form.searchPromises')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
                />
                {relatedPromiseIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {relatedPromiseIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-primary-500/10 text-primary-400 border border-primary-500/20"
                      >
                        #{id}
                        <button
                          onClick={() => setRelatedPromiseIds((prev) => prev.filter((p) => p !== id))}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimated Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t('proposals.form.estimatedCost')}
                </label>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder={t('proposals.form.costPlaceholder')}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 transition-all"
                />
              </div>

              {/* Error */}
              {createMutation.isError && (
                <div className="p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-sm text-red-400">
                  {createMutation.error?.message || t('proposals.createError')}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!isValid || createMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('proposals.submitProposal')}
                </button>
                <Link
                  href="/proposals"
                  className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {t('proposals.cancel')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
