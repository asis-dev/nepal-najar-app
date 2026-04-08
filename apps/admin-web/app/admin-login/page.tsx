'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mountain, Lock, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithOtp, verifyOtp, isLoading, error, clearError, isAdmin } = useAuth();

  const from = searchParams.get('from') || '/home';
  const notAdmin = searchParams.get('error') === 'not-admin';
  const ownerOnly = searchParams.get('error') === 'owner-only';

  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [roleError, setRoleError] = useState(
    ownerOnly
      ? 'This dashboard is owner-only. Sign in with the configured owner account.'
      : notAdmin
        ? 'This account does not have admin access.'
        : '',
  );

  const isEmailInput = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const isPhoneInput = /^\+?\d{7,15}$/.test(identifier.replace(/\s/g, ''));
  const isValid = isEmailInput || isPhoneInput;

  async function handleSendOtp() {
    clearError();
    setRoleError('');
    try {
      await signInWithOtp(identifier);
      setStep('otp');
    } catch { /* error set in store */ }
  }

  async function handleVerify() {
    clearError();
    setRoleError('');
    try {
      await verifyOtp(identifier, otp);
      // Check admin role after verification
      // The auth hook sets isAdmin after verifyOtp completes
      // We need to give it a tick to update
      setTimeout(() => {
        const state = useAuth.getState();
        if (state.isAdmin) {
          router.push(from);
          router.refresh();
        } else {
          setRoleError('This account does not have admin privileges. Contact a system administrator.');
          // Sign out non-admin
          state.signOut();
        }
      }, 500);
    } catch { /* error set in store */ }
  }

  return (
    <div className="min-h-screen bg-np-base flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Mountain className="h-8 w-8 text-primary-400" />
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Nepal<span className="text-gradient-blue">Republic</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500">Administrative Access</p>
        </div>

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {step === 'identifier' ? 'Dashboard Login' : 'Verify Code'}
              </h2>
              <p className="text-xs text-gray-500">
                {step === 'identifier'
                  ? 'Sign in with your admin email or phone'
                  : `Code sent to ${identifier}`}
              </p>
            </div>
          </div>

          {(error || roleError) && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error || roleError}</p>
            </div>
          )}

          {step === 'identifier' ? (
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Admin Email or Phone</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && isValid && handleSendOtp()}
                  placeholder="+977 98XXXXXXXX or admin@nepalrepublic.org"
                  className="input"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={!isValid || isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">Sending code...</span> : <><span>Send OTP</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerify()}
                  placeholder="Enter 6-digit code"
                  className="input text-center text-lg tracking-widest"
                  maxLength={6}
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={otp.length < 6 || isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">Verifying...</span> : <><span>Access Dashboard</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => { clearError(); setRoleError(''); setOtp(''); setStep('identifier'); }}
                disabled={isLoading}
                className="text-sm text-gray-500 hover:text-primary-400 w-full text-center flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Change {isEmailInput ? 'email' : 'number'}
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <a href="/explore" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-400 transition-colors">
              <Mountain className="w-4 h-4" />
              Back to public site
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          This area is restricted to authorized administrators.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-np-base flex items-center justify-center px-4">
          <div className="glass-card px-6 py-5 text-center">
            <p className="text-sm font-medium text-white">Loading secure access...</p>
            <p className="mt-1 text-xs text-gray-500">Preparing Nepal Republic operator login</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
