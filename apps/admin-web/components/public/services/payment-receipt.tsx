'use client';

interface PaymentReceiptProps {
  transactionId: string;
  amount: string;
  gateway: string;
  serviceSlug: string;
  serviceTitle?: string;
  date?: string;
}

/**
 * Converts a Gregorian date to approximate Bikram Sambat.
 * Not a full calendar — just adds 56 years 8 months for a rough BS date display.
 */
function toBS(ad: Date): string {
  const bsYear = ad.getFullYear() + 57;
  const months = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
  ];
  // Approximate BS month (off by ~2 months from AD)
  const adMonth = ad.getMonth(); // 0-based
  const bsMonthIdx = (adMonth + 8) % 12;
  const adjustedYear = adMonth >= 4 ? bsYear : bsYear - 1;
  return `${ad.getDate()} ${months[bsMonthIdx]} ${adjustedYear}`;
}

export function PaymentReceipt({
  transactionId,
  amount,
  gateway,
  serviceSlug,
  serviceTitle,
  date,
}: PaymentReceiptProps) {
  const now = date ? new Date(date) : new Date();
  const adDate = now.toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const bsDate = toBS(now);

  const gatewayLabel = gateway === 'esewa' ? 'eSewa' : gateway === 'khalti' ? 'Khalti' : gateway;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-emerald-300">Payment Successful</h2>
        <p className="text-sm text-zinc-400 mt-1">Your payment has been processed</p>
      </div>

      {/* Details */}
      <div className="space-y-3 bg-zinc-800/50 rounded-lg p-4 text-sm">
        <Row label="Service" value={serviceTitle || serviceSlug} />
        <Row label="Amount" value={`Rs. ${Number(amount).toLocaleString('en-NP')}`} highlight />
        <Row label="Gateway" value={gatewayLabel} />
        <Row label="Transaction ID" value={transactionId} mono />
        <Row label="Date (AD)" value={adDate} />
        <Row label="Date (BS)" value={bsDate} />
        <Row label="Status" value="Completed" highlight />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => window.print()}
          className="w-full py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold transition-colors"
        >
          Download / Print Receipt
        </button>
        <a
          href={`/services`}
          className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-center transition-colors border border-zinc-700"
        >
          Back to Services
        </a>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span
        className={`text-right ${highlight ? 'text-emerald-300 font-bold' : 'text-zinc-200'} ${
          mono ? 'font-mono text-xs break-all' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
