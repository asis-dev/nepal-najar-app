'use client';

import { useEffect, useState } from 'react';

type PaymentProfile = {
  preferredGateway: 'esewa' | 'khalti';
  walletLabel: string | null;
  walletHandleMasked: string | null;
  requireExplicitApproval: boolean;
  lastUpdatedAt: string | null;
};

interface PaymentCheckoutProps {
  serviceSlug: string;
  serviceTitle: string;
  feeAmount: string;       // e.g. "Rs. 5,000"
  feeAmountNPR: number;    // e.g. 5000
  serviceTaskId?: string;
}

export function PaymentCheckout({
  serviceSlug,
  serviceTitle,
  feeAmount,
  feeAmountNPR,
  serviceTaskId,
}: PaymentCheckoutProps) {
  const [loading, setLoading] = useState<'esewa' | 'khalti' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentProfile, setPaymentProfile] = useState<PaymentProfile | null>(null);
  const [preferredGateway, setPreferredGateway] = useState<'esewa' | 'khalti'>('esewa');
  const [walletLabel, setWalletLabel] = useState('');
  const [walletHandle, setWalletHandle] = useState('');
  const [requireExplicitApproval, setRequireExplicitApproval] = useState(true);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetch('/api/me/payment-profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const profile = data?.paymentProfile || null;
        setPaymentProfile(profile);
        if (profile?.preferredGateway) setPreferredGateway(profile.preferredGateway);
        if (typeof profile?.requireExplicitApproval === 'boolean') {
          setRequireExplicitApproval(profile.requireExplicitApproval);
        }
      })
      .catch(() => {});
  }, []);

  async function initiatePayment(gateway: 'esewa' | 'khalti') {
    setLoading(gateway);
    setError(null);

    try {
      const resp = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway,
          serviceSlug,
          serviceTitle,
          amount: feeAmountNPR,
          serviceTaskId,
          approvalConfirmed,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Payment initiation failed' }));
        throw new Error(err.error || 'Payment initiation failed');
      }

      const data = await resp.json();

      if (gateway === 'esewa' && data.formUrl && data.formParams) {
        // eSewa requires a form POST redirect
        submitEsewaForm(data.formUrl, data.formParams);
      } else if (gateway === 'khalti' && data.paymentUrl) {
        // Khalti gives us a direct URL
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Unexpected response from payment API');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(null);
    }
  }

  async function savePaymentProfile() {
    setSavingProfile(true);
    setError(null);
    try {
      const resp = await fetch('/api/me/payment-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredGateway,
          walletLabel,
          walletHandle,
          requireExplicitApproval,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Could not save payment preference');
      setPaymentProfile(data.paymentProfile || null);
      setWalletHandle('');
    } catch (err: any) {
      setError(err.message || 'Could not save payment preference');
    } finally {
      setSavingProfile(false);
    }
  }

  function submitEsewaForm(url: string, params: Record<string, string>) {
    // Create a hidden form and submit it to redirect to eSewa
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.style.display = 'none';

    for (const [key, value] of Object.entries(params)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 mt-6">
      <h3 className="text-sm font-bold uppercase text-zinc-300 mb-1">Pay Service Fee</h3>
      <p className="text-2xl font-black text-white mb-1">{feeAmount}</p>
      <p className="text-xs text-zinc-400 mb-4">
        Pay online via eSewa or Khalti. You will be redirected to complete payment.
      </p>

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4 mb-4">
        <div className="text-xs font-bold uppercase text-zinc-400 mb-2">Saved payment preference</div>
        {paymentProfile ? (
          <div className="mb-3 text-sm text-zinc-300">
            Preferred: <span className="font-semibold text-white">{paymentProfile.preferredGateway}</span>
            {paymentProfile.walletLabel ? ` · ${paymentProfile.walletLabel}` : ''}
            {paymentProfile.walletHandleMasked ? ` · ${paymentProfile.walletHandleMasked}` : ''}
          </div>
        ) : (
          <div className="mb-3 text-sm text-zinc-500">
            Save a preferred wallet once. NepalRepublic stores only masked wallet metadata, not raw credentials.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            value={preferredGateway}
            onChange={(e) => setPreferredGateway(e.target.value as 'esewa' | 'khalti')}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
          </select>
          <input
            value={walletLabel}
            onChange={(e) => setWalletLabel(e.target.value)}
            placeholder="Wallet label (optional)"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <input
            value={walletHandle}
            onChange={(e) => setWalletHandle(e.target.value)}
            placeholder="Mobile or wallet handle"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </div>

        <label className="mt-3 flex items-start gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={requireExplicitApproval}
            onChange={(e) => setRequireExplicitApproval(e.target.checked)}
            className="mt-0.5"
          />
          Require a human approval on every payment before NepalRepublic launches the wallet flow.
        </label>

        <button
          onClick={savePaymentProfile}
          disabled={savingProfile}
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
        >
          {savingProfile ? 'Saving…' : 'Save payment preference'}
        </button>
      </div>

      <label className="mb-4 flex items-start gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={approvalConfirmed}
          onChange={(e) => setApprovalConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        I approve NepalRepublic to launch this payment now. The actual payment is still completed on the official wallet surface.
      </label>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 mb-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* eSewa Button */}
        <button
          onClick={() => initiatePayment('esewa')}
          disabled={loading !== null || !approvalConfirmed}
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#60BB46' }}
        >
          {loading === 'esewa' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span className="text-2xl font-black tracking-tight">eSewa</span>
              <span className="text-[11px] opacity-80">Pay with eSewa</span>
            </>
          )}
        </button>

        {/* Khalti Button */}
        <button
          onClick={() => initiatePayment('khalti')}
          disabled={loading !== null || !approvalConfirmed}
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl py-4 px-3 font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#5C2D91' }}
        >
          {loading === 'khalti' ? (
            <LoadingSpinner />
          ) : (
            <>
              <span className="text-2xl font-black tracking-tight">Khalti</span>
              <span className="text-[11px] opacity-80">Pay with Khalti</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-zinc-500 mt-3 text-center">
        Secure payment is processed by eSewa/Khalti. NepalRepublic stores only masked wallet preference metadata and requires approval before launch.
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2">
      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Redirecting...</span>
    </div>
  );
}
