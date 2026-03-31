'use client';

import { useState } from 'react';
import { Star, Loader2, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePreferencesStore, NEPAL_PROVINCES } from '@/lib/stores/preferences';
import { useSubmitWardReport, type WardReportTopic } from '@/lib/hooks/use-ward-reports';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════
   TOPIC CONFIG
   ═══════════════════════════════════════════ */
const TOPICS: { id: WardReportTopic; icon: string; label: string; label_ne: string }[] = [
  { id: 'roads', icon: '\u{1F6E3}\uFE0F', label: 'Roads', label_ne: '\u0938\u0921\u0915' },
  { id: 'water', icon: '\u{1F4A7}', label: 'Water', label_ne: '\u092A\u093E\u0928\u0940' },
  { id: 'electricity', icon: '\u26A1', label: 'Electricity', label_ne: '\u092C\u093F\u091C\u0941\u0932\u0940' },
  { id: 'health', icon: '\u{1F3E5}', label: 'Health', label_ne: '\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F' },
  { id: 'education', icon: '\u{1F4DA}', label: 'Education', label_ne: '\u0936\u093F\u0915\u094D\u0937\u093E' },
  { id: 'sanitation', icon: '\u{1F6BF}', label: 'Sanitation', label_ne: '\u0938\u0930\u0938\u092B\u093E\u0907' },
  { id: 'internet', icon: '\u{1F4F6}', label: 'Internet', label_ne: '\u0907\u0928\u094D\u091F\u0930\u0928\u0947\u091F' },
  { id: 'safety', icon: '\u{1F512}', label: 'Safety', label_ne: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E' },
  { id: 'employment', icon: '\u{1F4BC}', label: 'Employment', label_ne: '\u0930\u094B\u091C\u0917\u093E\u0930\u0940' },
  { id: 'other', icon: '\u{1F4E6}', label: 'Other', label_ne: '\u0905\u0928\u094D\u092F' },
];

interface WardReportFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function WardReportForm({ onClose, onSuccess }: WardReportFormProps) {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated } = useAuth();
  const { province: userProvince, district: userDistrict } = usePreferencesStore();
  const submitMutation = useSubmitWardReport();

  const [selectedTopic, setSelectedTopic] = useState<WardReportTopic | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = selectedTopic && rating > 0 && isAuthenticated && userProvince && userDistrict;

  async function handleSubmit() {
    if (!canSubmit || !selectedTopic || !userProvince || !userDistrict) return;

    try {
      await submitMutation.mutateAsync({
        province: userProvince,
        district: userDistrict,
        topic: selectedTopic,
        rating,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // Error handled by mutation state
    }
  }

  if (submitted) {
    return (
      <div className="glass-card p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-1">
          {t('ward.thankYou')}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          {t('ward.reportSubmittedSuccess')}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setSelectedTopic(null);
            setRating(0);
            setDescription('');
          }}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          {t('ward.submitAnother')}
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-gray-400 mb-3">
          {t('ward.pleaseLogin')}
        </p>
      </div>
    );
  }

  if (!userProvince || !userDistrict) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-gray-400 mb-3">
          {t('ward.setProvinceDistrict')}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-white">
          {t('ward.reportFromMyWard')}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Topic selector — grid of icons */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          {t('ward.selectTopic')}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                selectedTopic === topic.id
                  ? 'bg-primary-500/20 border border-primary-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
              }`}
            >
              <span className="text-2xl">{topic.icon}</span>
              <span className="text-[10px] text-gray-400 leading-tight text-center">
                {isNe ? topic.label_ne : topic.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Star rating */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          {t('ward.rateYourArea')}
        </p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-gray-400 ml-2">
              {rating}/5
            </span>
          )}
        </div>
      </div>

      {/* Optional description */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          {t('ward.descriptionOptional')}
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          placeholder={t('ward.shareExperience')}
          rows={3}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-colors"
        />
        <p className="text-[10px] text-gray-600 mt-1 text-right">{description.length}/1000</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitMutation.isPending}
        className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          canSubmit && !submitMutation.isPending
            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 hover:bg-primary-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]'
            : 'bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed'
        }`}
      >
        {submitMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('ward.submitting')}
          </span>
        ) : (
          t('ward.submitReport')
        )}
      </button>

      {submitMutation.isError && (
        <p className="text-xs text-red-400 mt-2 text-center">
          {submitMutation.error?.message || 'Failed to submit'}
        </p>
      )}
    </div>
  );
}
