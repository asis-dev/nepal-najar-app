'use client';

import { Mountain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, isLoading, error, clearError } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function handleRequestOtp() {
    clearError();
    try {
      const result = await requestOtp(phone);
      // In dev mode the API returns the OTP so testers can log in
      // without SMS/email. Auto-fill it for convenience.
      if (result.devOtp) {
        setOtp(result.devOtp);
        setDevOtp(result.devOtp);
      }
      setStep('otp');
    } catch {
      // error state is set inside the store
    }
  }

  async function handleVerifyOtp() {
    clearError();
    try {
      await verifyOtp(phone, otp);
      router.push('/');
    } catch {
      // error state is set inside the store
    }
  }

  function handleBackToPhone() {
    clearError();
    setOtp('');
    setStep('phone');
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mountain className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nepal Najar</h1>
          <p className="text-gray-500 mt-1">Admin Dashboard</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number or Email
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && phone && handleRequestOtp()}
                placeholder="+977 98XXXXXXXX or email@gov.np"
                className="input"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleRequestOtp}
              disabled={!phone || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Enter the code sent to <span className="font-medium">{phone}</span>
            </p>
            {devOtp && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
                <span className="font-medium">Dev Mode:</span> OTP auto-filled →{' '}
                <span className="font-mono font-bold tracking-widest">{devOtp}</span>
              </div>
            )}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                placeholder="Enter 6-digit code"
                className="input text-center text-lg tracking-widest"
                maxLength={6}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={otp.length < 6 || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              onClick={handleBackToPhone}
              disabled={isLoading}
              className="text-sm text-primary-600 hover:text-primary-700 w-full text-center"
            >
              Change number
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-blue-200/60 text-xs mt-6">
        Government of Nepal - National Planning Commission
      </p>
    </div>
  );
}
