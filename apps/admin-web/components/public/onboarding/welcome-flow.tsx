'use client';

import { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  Heart,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  Sparkles,
  MapPin,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useUserPreferencesStore } from '@/lib/stores/preferences';
import { useAuth } from '@/lib/hooks/use-auth';

const INTEREST_CATEGORIES = [
  { id: 'governance', label: 'Governance', labelNe: 'शासन', emoji: '🏛' },
  { id: 'infrastructure', label: 'Infrastructure', labelNe: 'पूर्वाधार', emoji: '🏗' },
  { id: 'education', label: 'Education', labelNe: 'शिक्षा', emoji: '📚' },
  { id: 'health', label: 'Health', labelNe: 'स्वास्थ्य', emoji: '🏥' },
  { id: 'economy', label: 'Economy', labelNe: 'अर्थतन्त्र', emoji: '💰' },
  { id: 'environment', label: 'Environment', labelNe: 'वातावरण', emoji: '🌿' },
  { id: 'anti-corruption', label: 'Anti-Corruption', labelNe: 'भ्रष्टाचार विरोधी', emoji: '⚖' },
  { id: 'technology', label: 'Technology', labelNe: 'प्रविधि', emoji: '💻' },
  { id: 'energy', label: 'Energy', labelNe: 'ऊर्जा', emoji: '⚡' },
  { id: 'transport', label: 'Transport', labelNe: 'यातायात', emoji: '🚂' },
  { id: 'social', label: 'Social', labelNe: 'सामाजिक', emoji: '👥' },
];

const TOUR_STEPS = [
  {
    icon: Eye,
    color: 'text-primary-400',
    bg: 'bg-primary-500/15',
    titleEn: 'Track Government Promises',
    titleNe: 'सरकारी प्रतिज्ञा ट्र्याक गर्नुहोस्',
    descEn: 'We track 109 government commitments with AI-powered evidence analysis. See what\'s progressing, stalled, or delivered.',
    descNe: 'हामी AI-संचालित प्रमाण विश्लेषणसहित १०९ सरकारी प्रतिबद्धतालाई ट्र्याक गर्छौं।',
  },
  {
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    titleEn: 'Follow What Matters',
    titleNe: 'तपाईंको मतलबको कुरा फलो गर्नुहोस्',
    descEn: 'Tap the heart on any commitment to follow it. Get updates when new evidence or status changes appear.',
    descNe: 'कुनै पनि प्रतिबद्धतामा हृदय ट्याप गरेर फलो गर्नुहोस्। नयाँ प्रमाण वा स्थिति परिवर्तन हुँदा अपडेट पाउनुहोस्।',
  },
  {
    icon: ShieldCheck,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    titleEn: 'Verify & Earn Karma',
    titleNe: 'प्रमाणित गर्नुहोस् र कर्म कमाउनुहोस्',
    descEn: 'Submit evidence, verify claims, and comment. Earn karma to level up and unlock verifier status.',
    descNe: 'प्रमाण पेश गर्नुहोस्, दावी प्रमाणित गर्नुहोस्, र टिप्पणी गर्नुहोस्। कर्म कमाएर प्रमाणकर्ता बन्नुहोस्।',
  },
  {
    icon: BarChart3,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    titleEn: 'Republic Score',
    titleNe: 'रिपब्लिक स्कोर',
    descEn: 'Every commitment gets a letter grade (A-F) based on progress, evidence, and citizen feedback. See the full report card.',
    descNe: 'प्रत्येक प्रतिबद्धताले प्रगति, प्रमाण, र नागरिक प्रतिक्रियामा आधारित अक्षर ग्रेड (A-F) पाउँछ।',
  },
];

export function WelcomeFlow({ onComplete }: { onComplete: () => void }) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { user, session } = useAuth();
  const { setCategoriesOfInterest, setOnboardingComplete } = useUserPreferencesStore();

  const [step, setStep] = useState(0); // 0=welcome, 1=interests, 2-5=tour steps, 6=done
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const totalSteps = 3 + TOUR_STEPS.length; // welcome + interests + tour steps

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleFinish = () => {
    if (selectedInterests.length > 0) {
      setCategoriesOfInterest(selectedInterests);
    }
    setOnboardingComplete(true);
    onComplete();
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    onComplete();
  };

  const nextStep = () => {
    if (step === 1 && selectedInterests.length > 0) {
      setCategoriesOfInterest(selectedInterests);
    }
    if (step >= 1 + TOUR_STEPS.length) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const displayNameCandidates = [
    user?.displayName,
    typeof session?.user?.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : null,
    typeof session?.user?.user_metadata?.name === 'string'
      ? session.user.user_metadata.name
      : null,
    user?.email ? user.email.split('@')[0] : null,
    session?.user?.email ? session.user.email.split('@')[0] : null,
  ];

  const displayName =
    displayNameCandidates
      .map((name) => (typeof name === 'string' ? name.trim() : ''))
      .find((name) => name.length > 0) || (isNe ? 'साथी' : 'friend');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg mx-4">
        <div
          className="glass-card overflow-hidden"
          style={{
            boxShadow: '0 0 80px rgba(59,130,246,0.12), 0 25px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 shadow-glow-sm">
                <Sparkles className="h-10 w-10 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                {isNe
                  ? `स्वागत छ, ${displayName}!`
                  : `Welcome, ${displayName}!`}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-400 sm:text-base">
                {isNe
                  ? 'नेपाल रिपब्लिकमा सामेल हुनुभएकोमा धन्यवाद। तपाईं अब सरकारलाई जवाफदेही बनाउने समुदायको हिस्सा हुनुहुन्छ।'
                  : 'Thanks for joining Nepal Republic. You\'re now part of a community holding the government accountable.'}
              </p>
              <p className="mt-4 text-xs text-gray-500">
                {isNe
                  ? 'हामी तपाईंलाई छिट्टै सुरु गराउनेछौं — १ मिनेट मात्र लाग्छ।'
                  : 'Let\'s get you set up — it only takes a minute.'}
              </p>

              <button
                onClick={nextStep}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-500/20 px-8 py-3.5 text-sm font-semibold text-white border border-primary-500/40 transition-all hover:bg-primary-500/30 hover:scale-[1.02]"
              >
                {isNe ? 'सुरु गरौं' : 'Let\'s Go'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 1: Pick interests */}
          {step === 1 && (
            <div className="p-6 sm:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
                  <Star className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isNe ? 'तपाईंलाई के रुचि छ?' : 'What interests you?'}
                </h3>
                <p className="mt-1.5 text-sm text-gray-400">
                  {isNe
                    ? 'तपाईंको फिडलाई व्यक्तिगत बनाउन विषयहरू छान्नुहोस्'
                    : 'Pick topics to personalize your feed'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INTEREST_CATEGORIES.map((cat) => {
                  const selected = selectedInterests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        selected
                          ? 'bg-primary-500/15 border-primary-500/30 text-primary-300 border'
                          : 'border border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="truncate font-medium">
                        {isNe ? cat.labelNe : cat.label}
                      </span>
                      {selected && (
                        <CheckCircle2 className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-primary-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {isNe ? 'पछाडि' : 'Back'}
                </button>
                <button
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500/20 px-5 py-2.5 text-sm font-semibold text-white border border-primary-500/40 transition-all hover:bg-primary-500/30"
                >
                  {selectedInterests.length > 0
                    ? isNe
                      ? `${selectedInterests.length} चयन गरियो — अगाडि`
                      : `${selectedInterests.length} selected — Next`
                    : isNe
                      ? 'छोड्नुहोस्'
                      : 'Skip'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Steps 2-5: Tour */}
          {step >= 2 && step <= 1 + TOUR_STEPS.length && (() => {
            const tourIdx = step - 2;
            const tourStep = TOUR_STEPS[tourIdx];
            const Icon = tourStep.icon;
            const isLast = tourIdx === TOUR_STEPS.length - 1;

            return (
              <div className="p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${tourStep.bg}`}>
                    <Icon className={`h-7 w-7 ${tourStep.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {isNe ? tourStep.titleNe : tourStep.titleEn}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {isNe ? tourStep.descNe : tourStep.descEn}
                  </p>
                </div>

                {/* Step indicators */}
                <div className="mb-6 flex items-center justify-center gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === tourIdx
                          ? 'w-6 bg-primary-400'
                          : i < tourIdx
                            ? 'w-1.5 bg-primary-400/40'
                            : 'w-1.5 bg-gray-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {isNe ? 'पछाडि' : 'Back'}
                  </button>
                  <button
                    onClick={isLast ? handleFinish : nextStep}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-500/20 px-5 py-2.5 text-sm font-semibold text-white border border-primary-500/40 transition-all hover:bg-primary-500/30"
                  >
                    {isLast
                      ? isNe
                        ? 'सुरु गरौं!'
                        : 'Start Exploring!'
                      : isNe
                        ? 'अगाडि'
                        : 'Next'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
