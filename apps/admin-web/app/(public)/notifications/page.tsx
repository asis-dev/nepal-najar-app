'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellRing,
  Mail,
  Smartphone,
  Shield,
  Loader2,
  Check,
  MapPin,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePushNotifications } from '@/lib/hooks/use-push-notifications';

const PROVINCES = [
  { id: 'koshi', label: 'Koshi', labelNe: 'कोशी' },
  { id: 'madhesh', label: 'Madhesh', labelNe: 'मधेश' },
  { id: 'bagmati', label: 'Bagmati', labelNe: 'बागमती' },
  { id: 'gandaki', label: 'Gandaki', labelNe: 'गण्डकी' },
  { id: 'lumbini', label: 'Lumbini', labelNe: 'लुम्बिनी' },
  { id: 'karnali', label: 'Karnali', labelNe: 'कर्णाली' },
  { id: 'sudurpashchim', label: 'Sudurpashchim', labelNe: 'सुदूरपश्चिम' },
];

interface NotificationPrefs {
  email_alerts: boolean;
  push_enabled: boolean;
  digest_frequency: 'none' | 'weekly' | 'monthly';
  watched_provinces: string[];
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_alerts: false,
  push_enabled: false,
  digest_frequency: 'none',
  watched_provinces: [],
};

export default function NotificationsPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const push = usePushNotifications();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsFetching(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setPrefs({
            email_alerts: data.email_alerts ?? false,
            push_enabled: data.push_enabled ?? false,
            digest_frequency: data.digest_frequency ?? 'none',
            watched_provinces: data.watched_provinces ?? [],
          });
        }
      } catch {
        // use defaults
      } finally {
        setIsFetching(false);
      }
    })();
  }, [isAuthenticated, user]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail
    } finally {
      setIsSaving(false);
    }
  }, [prefs]);

  const toggleProvince = (id: string) => {
    setPrefs((prev) => ({
      ...prev,
      watched_provinces: prev.watched_provinces.includes(id)
        ? prev.watched_provinces.filter((p) => p !== id)
        : [...prev.watched_provinces, id],
    }));
  };

  // Auth loading skeleton
  if (authLoading || isFetching) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-6 w-20 bg-white/5 rounded animate-pulse mb-8" />
            <div className="h-10 w-64 bg-white/5 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-np-base">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? 'गृहपृष्ठ' : 'Home'}
            </Link>

            <div className="glass-card p-12 sm:p-16 text-center mt-8">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-300 mb-2">
                {isNe ? 'लगइन आवश्यक छ' : 'Login Required'}
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                {isNe
                  ? 'सूचना प्राथमिकताहरू प्रबन्ध गर्न कृपया लगइन गर्नुहोस्।'
                  : 'Please log in to manage your notification preferences.'}
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all duration-200"
              >
                {isNe ? 'अन्वेषण गर्नुहोस्' : 'Explore'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Breadcrumb */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="max-w-2xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
              <Link
                href="/"
                className="hover:text-primary-400 transition-colors"
              >
                {isNe ? 'गृहपृष्ठ' : 'Home'}
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-300">
                {isNe ? 'सूचनाहरू' : 'Notifications'}
              </span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400" />
              {isNe ? 'सूचना प्राथमिकताहरू' : 'Notification Preferences'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {isNe
                ? 'तपाईंले कसरी अपडेटहरू प्राप्त गर्नुहुन्छ अनुकूलन गर्नुहोस्।'
                : 'Customize how you receive updates about promises and projects.'}
            </p>
          </div>
        </section>

        {/* Settings */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Push Notifications */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20">
                  <Smartphone className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {isNe ? 'पुश सूचनाहरू' : 'Push Notifications'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {isNe
                          ? 'प्रतिज्ञा अपडेट हुँदा ब्राउजर सूचनाहरू प्राप्त गर्नुहोस्।'
                          : 'Get browser notifications when watched promises update.'}
                      </p>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={async () => {
                        if (push.isSubscribed) {
                          await push.unsubscribe();
                          setPrefs((p) => ({ ...p, push_enabled: false }));
                        } else {
                          const ok = await push.subscribe();
                          if (ok) setPrefs((p) => ({ ...p, push_enabled: true }));
                        }
                      }}
                      disabled={push.isLoading || !push.isSupported}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
                        push.isSubscribed
                          ? 'bg-primary-500'
                          : 'bg-white/10'
                      } ${(!push.isSupported || push.isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                          push.isSubscribed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Permission status */}
                  {!push.isSupported && (
                    <p className="text-xs text-amber-400/80 mt-2">
                      {isNe
                        ? 'तपाईंको ब्राउजरले पुश सूचनाहरू समर्थन गर्दैन।'
                        : 'Your browser does not support push notifications.'}
                    </p>
                  )}
                  {push.isSupported && push.permission === 'denied' && (
                    <p className="text-xs text-red-400/80 mt-2">
                      {isNe
                        ? 'सूचनाहरू अवरोध गरिएको छ। कृपया ब्राउजर सेटिङ्समा अनुमति दिनुहोस्।'
                        : 'Notifications are blocked. Please allow them in your browser settings.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Email Alerts */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {isNe ? 'इमेल अलर्टहरू' : 'Email Alerts'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {isNe
                          ? 'हेरिरहेका प्रतिज्ञाहरू अपडेट हुँदा इमेल प्राप्त गर्नुहोस्।'
                          : 'Receive email when your watched promises get updates.'}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setPrefs((p) => ({
                          ...p,
                          email_alerts: !p.email_alerts,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 cursor-pointer ${
                        prefs.email_alerts ? 'bg-primary-500' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                          prefs.email_alerts
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Digest */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <BellRing className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">
                    {isNe ? 'इमेल डाइजेस्ट' : 'Email Digest'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5 mb-4">
                    {isNe
                      ? 'सम्पूर्ण प्रगतिको नियमित सारांश प्राप्त गर्नुहोस्।'
                      : 'Receive a regular summary of all tracked progress.'}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {(
                      [
                        {
                          value: 'none' as const,
                          label: isNe ? 'कुनै पनि होइन' : 'None',
                        },
                        {
                          value: 'weekly' as const,
                          label: isNe ? 'साप्ताहिक' : 'Weekly',
                        },
                        {
                          value: 'monthly' as const,
                          label: isNe ? 'मासिक' : 'Monthly',
                        },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setPrefs((p) => ({
                            ...p,
                            digest_frequency: option.value,
                          }))
                        }
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                          prefs.digest_frequency === option.value
                            ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                            : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Province Alerts */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white">
                    {isNe ? 'प्रदेश अलर्टहरू' : 'Province Alerts'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5 mb-4">
                    {isNe
                      ? 'विशेष प्रदेशहरूमा परियोजना अपडेटहरूको सूचना पाउनुहोस्।'
                      : 'Get notified about project updates in specific provinces.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROVINCES.map((province) => {
                      const isChecked = prefs.watched_provinces.includes(
                        province.id
                      );
                      return (
                        <button
                          key={province.id}
                          onClick={() => toggleProvince(province.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border transition-all duration-200 text-left ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-gray-300'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-white/20'
                            }`}
                          >
                            {isChecked && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </span>
                          <span>
                            {isNe ? province.labelNe : province.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  saved
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-primary-500/20 border border-primary-500/40 text-white hover:bg-primary-500/30'
                } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isNe ? 'सुरक्षित गर्दै...' : 'Saving...'}
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {isNe ? 'सुरक्षित भयो!' : 'Saved!'}
                  </>
                ) : (
                  isNe ? 'प्राथमिकताहरू सुरक्षित गर्नुहोस्' : 'Save Preferences'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
