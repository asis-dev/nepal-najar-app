'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mountain, Lock, AlertCircle, ArrowRight } from 'lucide-react';

function AdminLoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') || '/home';
  const configError = searchParams.get('error') === 'not-configured';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-np-base flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Mountain className="h-8 w-8 text-primary-400" />
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Nepal <span className="text-gradient-blue">Najar</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500">Administrative Access</p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Dashboard Login</h2>
              <p className="text-xs text-gray-500">Enter admin password to continue</p>
            </div>
          </div>

          {configError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300">
                Admin access is not configured. Set the ADMIN_SECRET environment variable.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block mb-2 text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="input mb-6"
              autoFocus
              disabled={configError}
            />

            <button
              type="submit"
              disabled={loading || configError || !password}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <a
              href="/explore"
              className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-400 transition-colors"
            >
              <Mountain className="w-4 h-4" />
              Back to public site
            </a>
          </div>
        </div>

        {/* Footer */}
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
            <p className="mt-1 text-xs text-gray-500">Preparing Nepal Najar operator login</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
