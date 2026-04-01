'use client';

import { useState, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

const PROVINCES = [
  'Koshi',
  'Madhesh',
  'Bagmati',
  'Gandaki',
  'Lumbini',
  'Karnali',
  'Sudurpashchim',
];

/** Common countries — Nepal first, then alphabetical popular ones */
const COUNTRIES = [
  'Nepal',
  '---',
  'Australia',
  'Bangladesh',
  'Bhutan',
  'Canada',
  'China',
  'France',
  'Germany',
  'India',
  'Japan',
  'Malaysia',
  'Qatar',
  'Saudi Arabia',
  'Singapore',
  'South Korea',
  'Sri Lanka',
  'Thailand',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  '---',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Argentina',
  'Austria',
  'Bahrain',
  'Belgium',
  'Brazil',
  'Brunei',
  'Cambodia',
  'Chile',
  'Colombia',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Egypt',
  'Ethiopia',
  'Finland',
  'Greece',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jordan',
  'Kenya',
  'Kuwait',
  'Laos',
  'Lebanon',
  'Luxembourg',
  'Maldives',
  'Mexico',
  'Mongolia',
  'Morocco',
  'Myanmar',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Oman',
  'Pakistan',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Romania',
  'Russia',
  'South Africa',
  'Spain',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Tanzania',
  'Turkey',
  'Uganda',
  'Ukraine',
  'Vietnam',
];

/** Password strength checker */
function getPasswordStrength(pw: string): { score: number; checks: { label: string; pass: boolean }[] } {
  const checks = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'Contains uppercase letter', pass: /[A-Z]/.test(pw) },
    { label: 'Contains lowercase letter', pass: /[a-z]/.test(pw) },
    { label: 'Contains a number', pass: /[0-9]/.test(pw) },
    { label: 'Contains special character', pass: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter(c => c.pass).length;
  return { score, checks };
}

export default function SignupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { signUpWithPassword, isLoading, error, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('Nepal');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isNepal = country === 'Nepal';
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthColor =
    strength.score <= 2 ? 'bg-red-500' : strength.score <= 3 ? 'bg-amber-500' : strength.score <= 4 ? 'bg-blue-500' : 'bg-emerald-500';
  const strengthLabel =
    strength.score <= 2 ? 'Weak' : strength.score <= 3 ? 'Fair' : strength.score <= 4 ? 'Good' : 'Strong';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // Validation
    if (displayName.trim().length < 2) {
      setValidationError('Display name must be at least 2 characters');
      return;
    }

    if (password.length < 8) {
      setValidationError(t('auth.passwordMin'));
      return;
    }

    if (strength.score < 3) {
      setValidationError('Password is too weak. Add uppercase, numbers, or special characters.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError(t('auth.passwordMismatch'));
      return;
    }

    try {
      const result = await signUpWithPassword({
        email,
        password,
        displayName: displayName.trim(),
        country,
        province: isNepal ? province || undefined : undefined,
        district: isNepal ? district || undefined : undefined,
      });

      if (result.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/');
      }
    } catch {
      // error is set in the store
    }
  };

  const displayError = validationError || error;

  return (
    <div className="public-page flex items-center justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15">
            <UserPlus className="h-7 w-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t('auth.signupTitle')}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t('auth.signupSubtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {displayError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {displayError}
              </div>
            )}

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-gray-300">
                {t('auth.displayName')}
              </label>
              <input
                id="displayName"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Ram Bahadur"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ${
                      strength.score <= 2 ? 'text-red-400' : strength.score <= 3 ? 'text-amber-400' : strength.score <= 4 ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {strength.checks.map((check) => (
                      <div key={check.label} className="flex items-center gap-1.5 text-[10px]">
                        {check.pass ? (
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        ) : (
                          <X className="h-2.5 w-2.5 text-gray-600" />
                        )}
                        <span className={check.pass ? 'text-gray-400' : 'text-gray-600'}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-300">
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
              )}
              {confirmPassword.length > 0 && password === confirmPassword && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-gray-300">
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value !== 'Nepal') {
                    setProvince('');
                    setDistrict('');
                  }
                }}
                className="input appearance-none"
              >
                {COUNTRIES.map((c, i) =>
                  c === '---' ? (
                    <option key={`sep-${i}`} disabled>──────────</option>
                  ) : (
                    <option key={c} value={c}>{c}</option>
                  )
                )}
              </select>
            </div>

            {/* Province — only for Nepal */}
            {isNepal && (
              <div>
                <label htmlFor="province" className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t('auth.province')}
                </label>
                <select
                  id="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="input appearance-none"
                >
                  <option value="">{t('auth.selectProvince')}</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {t(`province.${p}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* District — only for Nepal */}
            {isNepal && (
              <div>
                <label htmlFor="district" className="mb-1.5 block text-sm font-medium text-gray-300">
                  {t('auth.district')}
                </label>
                <input
                  id="district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="input"
                  placeholder="Kathmandu"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-center"
            >
              {isLoading ? t('auth.signingUp') : t('auth.signUp')}
            </button>

            {/* Security note */}
            <p className="text-[10px] text-gray-600 text-center leading-relaxed">
              Your password is encrypted and never stored in plain text. We use industry-standard authentication via Supabase Auth.
            </p>
          </form>

          {/* Login link */}
          <div className="mt-6 border-t border-np-border pt-6 text-center text-sm text-gray-400">
            {t('auth.hasAccount')}{' '}
            <Link href="/login" className="font-medium text-primary-400 transition-colors hover:text-primary-300">
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
