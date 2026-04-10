'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const REASON_MESSAGES: Record<string, string> = {
  cancelled: 'You cancelled the payment.',
  missing_data: 'Payment response data was missing.',
  signature_mismatch: 'Payment signature could not be verified.',
  payment_not_complete: 'Payment was not completed.',
  parse_error: 'Could not process the payment response.',
  missing_pidx: 'Khalti payment reference was missing.',
  khalti_not_configured: 'Khalti payments are not configured yet.',
  lookup_failed: 'Could not verify payment with Khalti.',
  verify_error: 'Payment verification encountered an error.',
};

function FailureContent() {
  const params = useSearchParams();
  const reason = params.get('reason') || 'unknown';
  const service = params.get('service') || '';
  const txn = params.get('txn') || '';

  const message = REASON_MESSAGES[reason] || 'An unknown error occurred with your payment.';

  return (
    <div className="max-w-md mx-auto px-4 py-10 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
        <svg className="w-9 h-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-black text-red-300 mb-2">Payment Failed</h1>
      <p className="text-zinc-400 mb-6">{message}</p>

      {txn && (
        <p className="text-xs text-zinc-500 mb-4">
          Reference: <span className="font-mono">{txn}</span>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {service && (
          <Link
            href={`/services`}
            className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold transition-colors border border-red-500/30 block"
          >
            Try Again
          </Link>
        )}
        <Link
          href="/services"
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors border border-zinc-700 block"
        >
          Back to Services
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-10 text-center text-zinc-400">
          Loading...
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
