'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import CameraScanner, { type ScannedImage } from '@/components/public/vault/camera-scanner';
import type { ServiceTaskRecord } from '@/lib/services/task-types';
import { PaymentCheckout } from '@/components/public/services/payment-checkout';

type UtilityLookupPlan = {
  providerKey: 'nea' | 'kukl';
  providerName: string;
  accountLabel: string;
  officeLabel: string;
  officialLookupUrl: string;
  officialProviderUrl: string;
  helperText: string;
  paymentHint: string;
};

type UtilityLookupResponse = {
  summary: string;
  nextAction: string;
  directPaymentReady: boolean;
  normalized: {
    customerId: string;
    dueAmountNpr?: number | null;
  };
};

export function UtilityBillPanel({
  serviceSlug,
  serviceTitle,
}: {
  serviceSlug: string;
  serviceTitle: string;
}) {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [plan, setPlan] = useState<UtilityLookupPlan | null>(null);
  const [task, setTask] = useState<ServiceTaskRecord | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [officeOrBranch, setOfficeOrBranch] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lookup, setLookup] = useState<UtilityLookupResponse | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [liveLookupMessage, setLiveLookupMessage] = useState<string | null>(null);
  const [liveLookupLoading, setLiveLookupLoading] = useState(false);
  const [scanMeta, setScanMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!task) return;
    if (task.utilityLookup?.customer_id) setCustomerId(task.utilityLookup.customer_id);
    if (task.utilityLookup?.service_office) setOfficeOrBranch(task.utilityLookup.service_office);
    else if (task.utilityLookup?.branch) setOfficeOrBranch(task.utilityLookup.branch);
    if (typeof task.utilityLookup?.due_amount_npr === 'number') {
      setDueAmount(String(task.utilityLookup.due_amount_npr));
    }
    if (task.utilityLookup?.scan_meta && typeof task.utilityLookup.scan_meta === 'object') {
      setScanMeta(task.utilityLookup.scan_meta);
    }
  }, [task]);

  const assistantUtilityRationale =
    task?.assistantIntake?.domain === 'utilities'
      ? task.assistantIntake.utilities?.provider === 'nea'
        ? 'NepalRepublic already read this as an NEA electricity payment flow and will keep the account details on the case.'
        : task.assistantIntake.utilities?.provider === 'kukl'
          ? 'NepalRepublic already read this as a KUKL water bill flow and will keep the branch/account details on the case.'
          : 'NepalRepublic already recognized this as a utility payment flow and will keep the bill details on the case.'
      : null;

  useEffect(() => {
    fetch(`/api/services/utilities/${serviceSlug}/lookup-plan`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPlan(data?.plan || null))
      .catch(() => setPlan(null));
  }, [serviceSlug]);

  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/service-tasks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = (data?.tasks || []).find((row: ServiceTaskRecord) => row.serviceSlug === serviceSlug && row.status !== 'completed');
        setTask(match || null);
      })
      .catch(() => setTask(null));
  }, [authReady, user, serviceSlug]);

  async function saveLookup() {
    if (!task) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/me/service-tasks/${task.id}/utility-bill-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          serviceOffice: serviceSlug === 'nea-electricity-bill' ? officeOrBranch : undefined,
          branch: serviceSlug === 'kukl-water-bill' ? officeOrBranch : undefined,
          dueAmountNpr: dueAmount ? Number(dueAmount) : undefined,
          source: scanMeta?.source || 'manual',
          scanMeta: scanMeta || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save utility lookup');
      setLookup(data.lookup || null);
      setMessage(data.lookup?.nextAction || 'Bill lookup saved.');
    } catch (error: any) {
      setMessage(error.message || 'Could not save utility lookup');
    } finally {
      setSaving(false);
    }
  }

  async function tryLiveLookup() {
    if (!plan) return;
    if (!customerId.trim()) {
      setLiveLookupMessage(`Enter ${plan.accountLabel} first.`);
      return;
    }

    setLiveLookupLoading(true);
    setLiveLookupMessage(null);
    try {
      const response = await fetch(`/api/services/utilities/${serviceSlug}/live-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          serviceOffice: serviceSlug === 'nea-electricity-bill' ? officeOrBranch : undefined,
          branch: serviceSlug === 'kukl-water-bill' ? officeOrBranch : undefined,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setCustomerId(data.normalized.customerId || customerId);
        setOfficeOrBranch(data.normalized.serviceOffice || data.normalized.branch || officeOrBranch);
        if (typeof data.normalized.dueAmountNpr === 'number') {
          setDueAmount(String(data.normalized.dueAmountNpr));
        }
        setLiveLookupMessage(data.summary || 'Live bill lookup succeeded.');
        setScanMeta({ source: 'live', provider_summary: data.summary || null });
      } else {
        setLiveLookupMessage(data.summary || data.nextAction || 'Live lookup is not available right now.');
      }
    } catch (error: any) {
      setLiveLookupMessage(error.message || 'Live lookup failed.');
    } finally {
      setLiveLookupLoading(false);
    }
  }

  async function handleBillScan(image: ScannedImage) {
    const file = new File([image.blob], `utility_bill_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    setScanMessage('Scanning bill…');
    try {
      const response = await fetch(`/api/services/utilities/${serviceSlug}/scan-bill`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Bill scan failed');
      }

      if (data.customerId) setCustomerId(data.customerId);
      const officeValue = data.serviceOffice || data.branch;
      if (officeValue) setOfficeOrBranch(officeValue);
      if (typeof data.dueAmountNpr === 'number') setDueAmount(String(data.dueAmountNpr));

      setScanMeta({
        source: 'ocr',
        confidence: data.confidence,
        bill_date: data.billDate,
        account_holder: data.accountHolder,
      });
      setScanMessage(
        `Auto-filled from bill photo${typeof data.confidence === 'number' ? ` (${Math.round(data.confidence * 100)}%)` : ''}. Please confirm before saving.`,
      );
      setShowScanner(false);
    } catch (error: any) {
      setScanMessage(error.message || 'Bill scan failed.');
    }
  }

  if (!plan) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6">
      <div className="text-xs uppercase tracking-wide text-emerald-300 font-bold mb-1">Utility adapter</div>
      <h3 className="text-lg font-semibold text-zinc-100">Prepare the bill and payment path here</h3>
      <p className="text-sm text-zinc-400 mt-1">{plan.helperText}</p>
      {assistantUtilityRationale && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {assistantUtilityRationale}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Official surfaces</div>
          <div className="space-y-2 text-sm text-zinc-300">
            <a href={plan.officialLookupUrl} target="_blank" rel="noopener noreferrer" className="block text-emerald-300 hover:underline">
              Open {plan.providerName} surface ↗
            </a>
            <a href={plan.officialProviderUrl} target="_blank" rel="noopener noreferrer" className="block text-emerald-300 hover:underline">
              Open provider website ↗
            </a>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">What NepalRepublic will keep</div>
          <div className="space-y-1 text-sm text-zinc-300">
            <div>• Account details on your case</div>
            <div>• Amount due if you already know it</div>
            <div>• Payment receipt after checkout</div>
          </div>
          <div className="mt-2 text-xs text-zinc-400">{plan.paymentHint}</div>
        </div>
      </div>

      {!authReady || !user ? (
        <div className="mt-4">
          <Link
            href="/login?next=/services"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Sign in to save bill lookup
          </Link>
        </div>
      ) : !task ? (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          Start the {serviceTitle} workflow first, then NepalRepublic can save your provider details and continue to payment.
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-zinc-300">
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{plan.accountLabel}</div>
              <input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder={`Enter ${plan.accountLabel}`}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>

            <label className="text-sm text-zinc-300">
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">{plan.officeLabel} (optional)</div>
              <input
                value={officeOrBranch}
                onChange={(e) => setOfficeOrBranch(e.target.value)}
                placeholder={`Enter ${plan.officeLabel.toLowerCase()}`}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
          </div>

          <label className="mt-3 block text-sm text-zinc-300">
            <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Current amount due in NPR (optional)</div>
            <input
              type="number"
              min="1"
              value={dueAmount}
              onChange={(e) => setDueAmount(e.target.value)}
              placeholder="Enter the amount once you see it on the provider surface"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={saveLookup}
              disabled={saving || !customerId.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save bill lookup'}
            </button>
            <button
              onClick={tryLiveLookup}
              disabled={liveLookupLoading || !customerId.trim()}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-60"
            >
              {liveLookupLoading ? 'Checking…' : 'Try live lookup'}
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Scan bill photo
            </button>
            <Link href="/me/tasks" className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800">
              Open My Cases
            </Link>
          </div>

          {message && (
            <div className="mt-3 text-sm text-emerald-200">
              {message}
            </div>
          )}

          {liveLookupMessage && (
            <div className="mt-2 text-sm text-cyan-200">
              {liveLookupMessage}
            </div>
          )}

          {scanMessage && (
            <div className="mt-2 text-sm text-zinc-300">
              {scanMessage}
            </div>
          )}

          {lookup?.directPaymentReady && typeof lookup.normalized.dueAmountNpr === 'number' && (
            <PaymentCheckout
              serviceSlug={serviceSlug}
              serviceTitle={serviceTitle}
              feeAmount={`NPR ${lookup.normalized.dueAmountNpr.toLocaleString()}`}
              feeAmountNPR={lookup.normalized.dueAmountNpr}
              serviceTaskId={task.id}
            />
          )}
        </div>
      )}

      {showScanner && (
        <CameraScanner
          docType="other"
          serviceSlug={serviceSlug}
          onSave={(image) => void handleBillScan(image)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
