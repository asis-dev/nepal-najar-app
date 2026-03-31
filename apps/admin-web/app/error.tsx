'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Nepal Republic Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] px-4">
      <div className="glass-card p-8 sm:p-12 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
