'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
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

export default function SignupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { signUpWithPassword, isLoading, error, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (password.length < 8) {
      setValidationError(t('auth.passwordMin'));
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
        displayName,
        province: province || undefined,
        district: district || undefined,
      });

      if (result.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/explore');
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
              <p className="mt-1 text-xs text-gray-500">{t('auth.passwordMin')}</p>
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
            </div>

            {/* Province */}
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

            {/* District */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-center"
            >
              {isLoading ? t('auth.signingUp') : t('auth.signUp')}
            </button>
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
