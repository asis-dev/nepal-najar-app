'use client';

import { useEffect, useRef, useState } from 'react';
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
  Loader2,
  Camera,
} from 'lucide-react';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useReputation, getNextLevelThreshold, getCurrentLevelThreshold } from '@/lib/hooks/use-reputation';
import { useWatchlistStore, usePreferencesStore, NEPAL_PROVINCES } from '@/lib/stores/preferences';

export default function MePage() {
  const { locale, setLocale } = useI18n();
  const isNe = locale === 'ne';
  const router = useRouter();
  const authReady = useAuth((s) => s._initialized);
  const { user, isAuthenticated, isVerifier, signOut, patchUserProfile } = useAuth();
  const { karma, level, evidenceKarma, verificationKarma, communityKarma, isLoading: repLoading } = useReputation();
  const { watchedProjectIds } = useWatchlistStore();
  const { province, district, hasSetHometown, setHometown, clearHometown } = usePreferencesStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editProvince, setEditProvince] = useState(province || '');
  const [editDistrict, setEditDistrict] = useState(district || '');

  useEffect(() => {
    setEditDisplayName(user?.displayName || '');
    setEditPhone(user?.phone || '');
    setEditProvince(province || '');
    setEditDistrict(district || '');
  }, [user?.displayName, user?.phone, province, district]);

  if (!authReady) {
    return (
      <div className="public-page flex items-center justify-center px-4 py-20">
        <div className="glass-card flex items-center gap-3 px-6 py-5">
          <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
          <span className="text-sm text-gray-300">
            {isNe ? 'प्रोफाइल लोड हुँदैछ...' : 'Loading your profile...'}
          </span>
        </div>
      </div>
    );
  }

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

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      setProfileError(isNe ? 'नाम आवश्यक छ।' : 'Display name is required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          phone: editPhone.trim() || null,
          province: editProvince || null,
          district: editDistrict || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(body.error || (isNe ? 'प्रोफाइल सेभ गर्न सकेन।' : 'Failed to save profile.'));
        return;
      }

      const profile = body.profile as
        | {
            displayName: string;
            phone: string | null;
            province: string | null;
            district: string | null;
            avatarUrl: string | null;
          }
        | undefined;

      if (profile) {
        patchUserProfile({
          displayName: profile.displayName,
          phone: profile.phone,
          province: profile.province,
          district: profile.district,
          avatarUrl: profile.avatarUrl,
        });
      }

      if (editProvince) {
        setHometown(editProvince, editDistrict || undefined);
      } else {
        clearHometown();
      }

      setIsEditingProfile(false);
      setProfileSuccess(isNe ? 'प्रोफाइल अपडेट भयो।' : 'Profile updated.');
    } catch {
      setProfileError(isNe ? 'प्रोफाइल सेभ गर्न सकेन।' : 'Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleAvatarUpload = async (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError(isNe ? 'कृपया तस्बिर फाइल छान्नुहोस्।' : 'Please choose an image file.');
      return;
    }

    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      setProfileError(isNe ? 'तस्बिर 3MB भन्दा सानो हुनुपर्छ।' : 'Image must be under 3MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadBody = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !Array.isArray(uploadBody.urls) || !uploadBody.urls[0]) {
        setProfileError(uploadBody.error || (isNe ? 'तस्बिर अपलोड असफल भयो।' : 'Avatar upload failed.'));
        return;
      }

      const avatarUrl = uploadBody.urls[0] as string;
      const saveRes = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl }),
      });
      const saveBody = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setProfileError(saveBody.error || (isNe ? 'प्रोफाइल फोटो सेभ भएन।' : 'Failed to save avatar.'));
        return;
      }

      patchUserProfile({ avatarUrl });
      setProfileSuccess(isNe ? 'प्रोफाइल फोटो अपडेट भयो।' : 'Profile photo updated.');
    } catch {
      setProfileError(isNe ? 'तस्बिर अपलोड असफल भयो।' : 'Avatar upload failed.');
    } finally {
      setIsUploadingAvatar(false);
    }
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
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-primary-500/20 bg-primary-500/10">
                    {user?.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={isNe ? 'प्रोफाइल फोटो' : 'Profile photo'}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-7 w-7 text-primary-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-white">
                      {user?.displayName || 'User'}
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-400">{user?.email}</p>
                    {user?.phone && (
                      <p className="mt-0.5 text-xs text-gray-500">{user.phone}</p>
                    )}

                    {/* Role badge */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-xs font-medium text-primary-400 border border-primary-500/20">
                        <User className="h-3 w-3" />
                        {user?.role === 'verifier'
                          ? isNe ? 'प्रमाणकर्ता' : 'Verifier'
                          : user?.role === 'admin'
                            ? isNe ? 'एडमिन' : 'Admin'
                            : user?.role === 'observer'
                              ? isNe ? 'पर्यवेक्षक' : 'Observer'
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
                  <button
                    onClick={() => {
                      setProfileError(null);
                      setProfileSuccess(null);
                      setIsEditingProfile(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-np-border px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.04]"
                  >
                    <Edit3 className="h-3 w-3" />
                    {isNe ? 'सम्पादन' : 'Edit'}
                  </button>
                </div>

                {(profileError || profileSuccess) && (
                  <div
                    className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
                      profileError
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {profileError || profileSuccess}
                  </div>
                )}

                {/* Profile setup */}
                <div className="mt-4 border-t border-np-border pt-4">
                  {isEditingProfile ? (
                    <div className="space-y-3">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void handleAvatarUpload(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-300">
                          {isNe ? 'प्रोफाइल सम्पादन गर्नुहोस्' : 'Edit Profile'}
                        </p>
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="inline-flex items-center gap-1 rounded-lg border border-np-border px-2 py-1 text-[11px] text-gray-300 hover:bg-white/[0.04] disabled:opacity-60"
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Camera className="h-3.5 w-3.5" />
                          )}
                          {isNe ? 'फोटो' : 'Photo'}
                        </button>
                      </div>

                      <input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder={isNe ? 'पूरा नाम' : 'Full name'}
                        className="input w-full text-sm"
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder={isNe ? 'फोन (वैकल्पिक)' : 'Phone (optional)'}
                        className="input w-full text-sm"
                      />

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

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="rounded-xl border border-np-border py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.04]"
                        >
                          <X className="mr-1.5 inline h-4 w-4" />
                          {isNe ? 'रद्द' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile}
                          className="btn-primary w-full py-2.5 text-center text-sm disabled:opacity-70"
                        >
                          {isSavingProfile ? (
                            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 inline h-4 w-4" />
                          )}
                          {isNe ? 'सेभ' : 'Save'}
                        </button>
                      </div>
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
                      <span className="text-[11px] text-gray-600">
                        {isNe ? 'प्रोफाइल अपडेट गर्न Edit क्लिक गर्नुहोस्' : 'Click Edit to update'}
                      </span>
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
                  href="/me/tasks"
                  className="mb-4 flex items-center justify-between rounded-xl border border-np-border px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {isNe ? 'मेरो सेवाहरू' : 'My Tasks'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isNe ? 'सेवा कार्यप्रवाह जारी राख्नुहोस्' : 'Continue service workflows'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </Link>
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
