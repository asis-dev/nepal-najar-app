'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';

function VerifyContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    setResent(false);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError('Authentication not configured');
      setResending(false);
      return;
    }

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) throw resendError;
      setResent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="public-page flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-md">
        <div className="glass-card p-6 text-center sm:p-8">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15">
            <Mail className="h-8 w-8 text-primary-400" />
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-white sm:text-2xl">
            {t('auth.verifyTitle')}
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            {t('auth.verifySubtitle')}
          </p>

          {email && (
            <p className="mt-2 text-sm font-medium text-gray-300">{email}</p>
          )}

          {/* Status messages */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {resent && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {t('auth.resent')}
            </div>
          )}

          {/* Resend button */}
          {email && (
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn-secondary mt-6 inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? t('auth.resending') : t('auth.resendVerification')}
            </button>
          )}

          {/* Back to login */}
          <div className="mt-6 border-t border-np-border pt-6">
            <Link
              href="/login"
              className="text-sm font-medium text-primary-400 transition-colors hover:text-primary-300"
            >
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="public-page flex items-center justify-center py-24"><div className="skeleton h-64 w-full max-w-md rounded-2xl" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
