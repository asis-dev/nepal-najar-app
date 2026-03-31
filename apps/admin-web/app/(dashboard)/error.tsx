'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Nepal Republic Dashboard Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 sm:p-12 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🔧</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Dashboard Error
        </h2>
        <p className="text-gray-400 text-sm mb-2">
          {error.message || 'An error occurred in the admin dashboard.'}
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
