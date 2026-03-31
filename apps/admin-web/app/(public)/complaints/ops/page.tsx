'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, BarChart3, Loader2, ShieldAlert, TimerReset } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';
import {
  useComplaintDashboard,
  useComplaintDepartments,
  useComplaintInbox,
} from '@/lib/hooks/use-complaints';

export default function ComplaintOpsPage() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { isAuthenticated, isVerifier } = useAuth();

  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [slaState, setSlaState] = useState<'' | 'on_track' | 'due_soon' | 'breached' | 'not_applicable'>('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const inboxFilters = useMemo(
    () => ({
      department_key: department || undefined,
      status: status || undefined,
      sla_state: slaState || undefined,
      limit: 80,
      offset: 0,
    }),
    [department, slaState, status],
  );

  const { data: departmentsData } = useComplaintDepartments();
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useComplaintDashboard(30);
  const { data: inboxData, isLoading: inboxLoading, error: inboxError, refetch: refetchInbox } = useComplaintInbox(inboxFilters);

  const runSlaScan = async () => {
    setScanBusy(true);
    setScanMessage(null);
    try {
      const response = await fetch('/api/complaints/sla-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_escalate: false }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Failed (${response.status})`);

      setScanMessage(
        isNe
          ? `SLA scan सकियो: ${payload.breached_marked || 0} breach मार्क भयो।`
          : `SLA scan complete: ${payload.breached_marked || 0} cases marked breached.`,
      );
      await Promise.all([refetchDashboard(), refetchInbox()]);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'Failed to run SLA scan');
    } finally {
      setScanBusy(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="public-page">
        <section className="public-section">
          <div className="public-shell">
            <div className="glass-card p-8 text-sm text-gray-300">
              {isNe ? 'यो पृष्ठ हेर्न लगइन आवश्यक छ।' : 'Please sign in to access operations.'}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!isVerifier) {
    return (
      <div className="public-page">
        <section className="public-section">
          <div className="public-shell">
            <div className="glass-card p-8 text-sm text-gray-300">
              <ShieldAlert className="mr-2 inline h-4 w-4 text-amber-300" />
              {isNe ? 'यो पृष्ठका लागि verifier/admin अधिकार चाहिन्छ।' : 'Verifier/admin access required for this page.'}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="public-page">
      <section className="public-section pb-8">
        <div className="public-shell space-y-4">
          <Link href="/complaints" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            {isNe ? 'उजुरीमा फर्कनुहोस्' : 'Back to complaints'}
          </Link>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isNe ? 'उजुरी संचालन केन्द्र' : 'Complaint Operations Hub'}
                </h1>
                <p className="mt-1 text-sm text-gray-300">
                  {isNe ? 'SLA, escalation, assignment, र resolution स्थिति ट्र्याक गर्नुहोस्।' : 'Track SLA, escalations, assignments, and resolution performance.'}
                </p>
              </div>
              <button
                onClick={runSlaScan}
                disabled={scanBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
              >
                {scanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />}
                {isNe ? 'SLA Scan चलाउनुहोस्' : 'Run SLA Scan'}
              </button>
            </div>
            {scanMessage && (
              <p className="mt-3 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-gray-200">
                {scanMessage}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{isNe ? 'कुल केस' : 'Total Cases'}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{dashboardData?.totals.complaints ?? '—'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{isNe ? 'खुला केस' : 'Open'}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{dashboardData?.totals.open ?? '—'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{isNe ? 'SLA Breached' : 'SLA Breached'}</p>
              <p className="mt-1 text-2xl font-semibold text-red-300">{dashboardData?.totals.breached_open ?? '—'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">{isNe ? 'Resolution Rate' : 'Resolution Rate'}</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{dashboardData?.totals.resolution_rate ?? '—'}%</p>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">{isNe ? 'सबै विभाग' : 'All departments'}</option>
                {(departmentsData?.departments || []).map((dept) => (
                  <option key={dept.key} value={dept.key}>
                    {isNe ? dept.name_ne : dept.name}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">{isNe ? 'सबै स्थिति' : 'All status'}</option>
                {['submitted', 'triaged', 'routed', 'acknowledged', 'in_progress', 'resolved', 'closed', 'needs_info'].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select
                value={slaState}
                onChange={(event) => setSlaState(event.target.value as '' | 'on_track' | 'due_soon' | 'breached' | 'not_applicable')}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">{isNe ? 'सबै SLA स्थिति' : 'All SLA states'}</option>
                <option value="on_track">on_track</option>
                <option value="due_soon">due_soon</option>
                <option value="breached">breached</option>
              </select>
              <button
                onClick={() => { setDepartment(''); setStatus(''); setSlaState(''); }}
                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-gray-200 hover:bg-white/[0.08]"
              >
                {isNe ? 'फिल्टर रिसेट' : 'Reset filters'}
              </button>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">
              <BarChart3 className="mr-2 inline h-4 w-4" />
              {isNe ? 'विभाग अनुसार रिपोर्ट (३० दिन)' : 'Department Report (30 days)'}
            </h2>
            {dashboardLoading ? (
              <p className="text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading dashboard...</p>
            ) : dashboardError ? (
              <p className="text-sm text-red-200">{dashboardError instanceof Error ? dashboardError.message : 'Failed to load dashboard.'}</p>
            ) : (
              <div className="space-y-2">
                {(dashboardData?.by_department || []).map((dept) => (
                  <div key={dept.department_key} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm text-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{dept.department_key}</strong>
                      <span className="text-xs text-gray-400">
                        {dept.total} total · {dept.open} open · {dept.breached_open} breached · {dept.resolved} resolved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {isNe ? 'इनबक्स केसहरू' : 'Inbox Cases'}
            </h2>
            {inboxLoading ? (
              <p className="text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading inbox...</p>
            ) : inboxError ? (
              <p className="text-sm text-red-200">{inboxError instanceof Error ? inboxError.message : 'Failed to load inbox.'}</p>
            ) : (
              <div className="space-y-2">
                {(inboxData?.complaints || []).map((item) => (
                  <Link
                    key={item.id}
                    href={`/complaints/${item.id}`}
                    className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-white">{item.title}</strong>
                      <span className="text-xs text-gray-400">
                        {item.status} · {item.sla_state || 'n/a'} · {item.assigned_department_key || item.department_key || 'unassigned'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-300">{item.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
