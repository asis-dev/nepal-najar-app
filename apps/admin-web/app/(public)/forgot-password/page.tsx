'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { resetPassword, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSent(false);

    try {
      await resetPassword(email);
      setSent(true);
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
            <KeyRound className="h-7 w-7 text-primary-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {t('auth.forgotTitle')}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t('auth.forgotSubtitle')}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 sm:p-8">
          {sent ? (
            <div className="text-center">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
                {t('auth.resetSent')}
              </div>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
                >
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </div>
          ) : (
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

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-center"
              >
                {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
              </button>
            </form>
          )}

          {/* Back to login */}
          {!sent && (
            <div className="mt-6 border-t border-np-border pt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
