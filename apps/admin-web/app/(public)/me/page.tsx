'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  Star,
  Heart,
  LogIn,
  LogOut,
  ShieldCheck,
  Award,
  ChevronRight,
  FileCheck,
  MessageSquare,
  Swords,
  Globe,
  HelpCircle,
  Scale,
  AlertCircle,
  Shield,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useReputation, getNextLevelThreshold, getCurrentLevelThreshold } from '@/lib/hooks/use-reputation';
import { useWatchlistStore, usePreferencesStore, NEPAL_PROVINCES } from '@/lib/stores/preferences';

export default function MePage() {
  const { locale, setLocale } = useI18n();
  const isNe = locale === 'ne';
  const router = useRouter();
  const { user, isAuthenticated, isVerifier, signOut } = useAuth();
  const { karma, level, evidenceKarma, verificationKarma, communityKarma, isLoading: repLoading } = useReputation();
  const { watchedProjectIds } = useWatchlistStore();
  const { province, district, hasSetHometown, setHometown } = usePreferencesStore();

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editProvince, setEditProvince] = useState(province || '');
  const [editDistrict, setEditDistrict] = useState(district || '');

  if (!isAuthenticated) {
    return (
      <div className="public-page flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md text-center">
          <div className="glass-card p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15">
              <LogIn className="h-8 w-8 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {isNe ? 'साइन इन गर्नुहोस्' : 'Sign in to view your profile'}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              {isNe
                ? 'तपाईंको प्रोफाइल, कर्म, र फलो गरिएका प्रतिबद्धताहरू हेर्नुहोस्'
                : 'View your profile, karma, and followed commitments'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                className="btn-primary w-full py-3 text-center"
              >
                {isNe ? 'साइन इन' : 'Sign In'}
              </Link>
              <Link
                href="/signup"
                className="w-full rounded-xl border border-np-border py-3 text-center text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.04]"
              >
                {isNe ? 'नयाँ खाता बनाउनुहोस्' : 'Create Account'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nextThreshold = getNextLevelThreshold(level);
  const currentThreshold = getCurrentLevelThreshold(level);
  const progressPercent = nextThreshold
    ? Math.min(100, ((karma - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  const handleSaveLocation = () => {
    if (editProvince) {
      setHometown(editProvince, editDistrict || undefined);
    }
    setIsEditingLocation(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const selectedProvinceData = NEPAL_PROVINCES.find((p) => p.name === editProvince);

  return (
    <div className="public-page">
      <div className="relative z-10">
        <section className="public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-2xl space-y-6">

              {/* Profile card */}
              <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/15">
                    <User className="h-7 w-7 text-primary-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-white">
                      {user?.displayName || 'User'}
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-400">{user?.email}</p>

                    {/* Role badge */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-medium text-primary-400 border border-primary-500/20">
                        <User className="h-3 w-3" />
                        {user?.role === 'verifier'
                          ? isNe ? 'प्रमाणकर्ता' : 'Verifier'
                          : user?.role === 'admin'
                            ? isNe ? 'एडमिन' : 'Admin'
                            : isNe ? 'नागरिक' : 'Citizen'}
                      </span>
                      {isVerifier && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400 border border-cyan-500/20">
                          <ShieldCheck className="h-3 w-3" />
                          {isNe ? 'प्रमाणकर्ता' : 'Verifier'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="mt-4 border-t border-np-border pt-4">
                  {isEditingLocation ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-300">
                          {isNe ? 'ठाउँ सम्पादन गर्नुहोस्' : 'Edit Location'}
                        </p>
                        <button
                          onClick={() => setIsEditingLocation(false)}
                          className="rounded-lg p-1 text-gray-500 hover:text-gray-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <select
                        value={editProvince}
                        onChange={(e) => {
                          setEditProvince(e.target.value);
                          setEditDistrict('');
                        }}
                        className="input w-full appearance-none text-sm"
                      >
                        <option value="">{isNe ? 'प्रदेश छान्नुहोस्' : 'Select Province'}</option>
                        {NEPAL_PROVINCES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {isNe ? p.name_ne : p.name}
                          </option>
                        ))}
                      </select>
                      {selectedProvinceData && (
                        <select
                          value={editDistrict}
                          onChange={(e) => setEditDistrict(e.target.value)}
                          className="input w-full appearance-none text-sm"
                        >
                          <option value="">{isNe ? 'जिल्ला छान्नुहोस्' : 'Select District'}</option>
                          {selectedProvinceData.districts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={handleSaveLocation}
                        disabled={!editProvince}
                        className="btn-primary w-full py-2.5 text-center text-sm"
                      >
                        <Save className="mr-2 inline h-4 w-4" />
                        {isNe ? 'सेभ गर्नुहोस्' : 'Save Location'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="h-4 w-4" />
                        {hasSetHometown ? (
                          <span>
                            {district && `${district}, `}
                            {isNe
                              ? NEPAL_PROVINCES.find((p) => p.name === province)?.name_ne || province
                              : province}
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            {isNe ? 'ठाउँ सेट गरिएको छैन' : 'Location not set'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditProvince(province || '');
                          setEditDistrict(district || '');
                          setIsEditingLocation(true);
                        }}
                        className="flex items-center gap-1 text-xs text-primary-400 transition-colors hover:text-primary-300"
                      >
                        <Edit3 className="h-3 w-3" />
                        {isNe ? 'सम्पादन' : 'Edit'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Karma card */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                      <Star className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{repLoading ? '—' : karma}</p>
                      <p className="text-xs text-gray-500">{isNe ? 'कुल कर्म' : 'Total Karma'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 border border-primary-500/20">
                      <Award className="h-3.5 w-3.5 text-primary-400" />
                      <span className="text-sm font-semibold text-primary-300">
                        {isNe ? `स्तर ${level}` : `Level ${level}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress to next level */}
                {nextThreshold && !repLoading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>{isNe ? `स्तर ${level}` : `Level ${level}`}</span>
                      <span>{isNe ? `स्तर ${level + 1}` : `Level ${level + 1}`}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-600">
                      {karma} / {nextThreshold} {isNe ? 'कर्म' : 'karma'}
                    </p>
                  </div>
                )}

                {/* Karma breakdown */}
                {!repLoading && (
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-np-border pt-4">
                    <div className="text-center">
                      <FileCheck className="mx-auto h-4 w-4 text-emerald-400" />
                      <p className="mt-1 text-sm font-semibold text-emerald-400">{evidenceKarma}</p>
                      <p className="text-[10px] text-gray-500">{isNe ? 'प्रमाण' : 'Evidence'}</p>
                    </div>
                    <div className="text-center">
                      <ShieldCheck className="mx-auto h-4 w-4 text-cyan-400" />
                      <p className="mt-1 text-sm font-semibold text-cyan-400">{verificationKarma}</p>
                      <p className="text-[10px] text-gray-500">{isNe ? 'प्रमाणीकरण' : 'Verification'}</p>
                    </div>
                    <div className="text-center">
                      <MessageSquare className="mx-auto h-4 w-4 text-purple-400" />
                      <p className="mt-1 text-sm font-semibold text-purple-400">{communityKarma}</p>
                      <p className="text-[10px] text-gray-500">{isNe ? 'समुदाय' : 'Community'}</p>
                    </div>
                  </div>
                )}

                <Link
                  href="/reputation"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-np-border py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-gray-200"
                >
                  {isNe ? 'विस्तृत प्रतिष्ठा हेर्नुहोस्' : 'View Full Reputation'}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Following */}
              <div className="glass-card p-5">
                <Link
                  href="/watchlist"
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-rose-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {isNe ? 'फलो गरिएका' : 'Following'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {watchedProjectIds.length} {isNe ? 'प्रतिबद्धता' : 'commitments'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </Link>
              </div>

              {/* Quick links */}
              <div className="glass-card divide-y divide-np-border">
                <QuickLink
                  href="/disputed"
                  icon={Swords}
                  label={isNe ? 'विवाद' : 'Disputes'}
                />
                <QuickLink
                  href="/scorecard"
                  icon={Award}
                  label={isNe ? 'मन्त्रालय' : 'Ministries'}
                />
                <QuickLink
                  href="/constitution"
                  icon={Scale}
                  label={isNe ? 'संविधान' : 'Constitution'}
                />
                <QuickLink
                  href="/complaints"
                  icon={AlertCircle}
                  label={isNe ? 'नागरिक समस्या' : 'Civic Issues'}
                />
                {isVerifier && (
                  <QuickLink
                    href="/complaints/ops"
                    icon={Shield}
                    label={isNe ? 'उजुरी सञ्चालन' : 'Complaint Ops'}
                  />
                )}
                <QuickLink
                  href="/about"
                  icon={HelpCircle}
                  label={isNe ? 'बारेमा' : 'About'}
                />
                <QuickLink
                  href="/how-it-works"
                  icon={HelpCircle}
                  label={isNe ? 'कसरी काम गर्छ' : 'How It Works'}
                />
                <QuickLink
                  href="/feedback"
                  icon={MessageSquare}
                  label={isNe ? 'प्रतिक्रिया' : 'Feedback'}
                />

                {/* Language toggle */}
                <button
                  onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}
                  className="flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {locale === 'en' ? 'नेपाली' : 'English'}
                    </span>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                    {locale === 'en' ? 'EN' : 'ने'}
                  </span>
                </button>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="glass-card flex w-full items-center justify-center gap-2 px-5 py-4 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/5"
              >
                <LogOut className="h-4 w-4" />
                {isNe ? 'साइन आउट' : 'Sign Out'}
              </button>

              <div className="h-20" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
    </Link>
  );
}
