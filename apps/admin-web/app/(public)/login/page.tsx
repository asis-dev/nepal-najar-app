'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { signInWithPassword, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await signInWithPassword(email, password);
      router.push('/');
    } catch {
      // error is set in the store
    }
  };

  return (
    <div className="public-page flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15">
            <LogIn className="h-7 w-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

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
                  autoComplete="current-password"
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
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-400 transition-colors hover:text-primary-300"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-center"
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          {/* Signup link */}
          <div className="mt-6 border-t border-np-border pt-6 text-center text-sm text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link href="/signup" className="font-medium text-primary-400 transition-colors hover:text-primary-300">
              {t('auth.signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
