'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Nepal Republic Public Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass-card p-8 sm:p-12 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🏔️</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Page could not load
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {error.message?.includes('fetch')
            ? 'Could not connect to the data service. Please check your connection and try again.'
            : 'Something unexpected happened. Our team has been notified.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
