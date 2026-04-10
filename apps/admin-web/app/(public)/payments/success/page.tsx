'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentReceipt } from '@/components/public/services/payment-receipt';

function SuccessContent() {
  const params = useSearchParams();
  const txn = params.get('txn') || '';
  const amount = params.get('amount') || '0';
  const gateway = params.get('gateway') || '';
  const service = params.get('service') || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <PaymentReceipt
        transactionId={txn}
        amount={amount}
        gateway={gateway}
        serviceSlug={service}
      />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 py-10 text-center text-zinc-400">
          Loading receipt...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
