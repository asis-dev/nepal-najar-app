'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Bell, BellOff, Building2, Layers, Loader2, MessageCircle, PlusCircle, Shield, Timer } from 'lucide-react';
import { useComplaint, useComplaintDepartments, useComplaintEvidence, useComplaintEvents } from '@/lib/hooks/use-complaints';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/i18n';

function formatTime(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

function AuthorityCard({ route, isNe }: { route: Record<string, string>; isNe: boolean }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3">
        <Building2 className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
            {isNe ? 'AI रुटिङ सुझाव' : 'AI routing suggestion'}
          </p>
          <p className="text-sm font-medium text-white">
            {isNe ? route.authorityNe : route.authority}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{route.office}</p>
          {route.routingReason && (
            <p className="text-[11px] text-gray-500 mt-1 italic">{route.routingReason}</p>
          )}
          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-400 mt-2">
            {route.level === 'federal' ? (isNe ? 'संघीय' : 'Federal') : route.level === 'provincial' ? (isNe ? 'प्रदेश' : 'Provincial') : (isNe ? 'स्थानीय' : 'Local')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const complaintId = typeof params?.id === 'string' ? params.id : null;
  const { isAuthenticated, isVerifier, user } = useAuth();
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const queryClient = useQueryClient();

  const { data: complaintData, isLoading, error } = useComplaint(complaintId);
  const { data: eventData, isLoading: isEventsLoading } = useComplaintEvents(complaintId);
  const { data: evidenceData, isLoading: isEvidenceLoading } = useComplaintEvidence(complaintId);
  const { data: departmentsData } = useComplaintDepartments();

  const complaint = complaintData?.complaint;
  const events = eventData?.events || [];
  const evidence = evidenceData?.evidence || [];
  const isOwner = Boolean(user?.id && complaint?.user_id === user.id);

  const [followBusy, setFollowBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(Boolean(complaint?.is_following));
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceSuccess, setEvidenceSuccess] = useState<string | null>(null);

  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [assignDepartment, setAssignDepartment] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [escalateDepartment, setEscalateDepartment] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [opsBusy, setOpsBusy] = useState(false);
  const [opsMessage, setOpsMessage] = useState<string | null>(null);

  const [satisfactionRating, setSatisfactionRating] = useState('5');
  const [satisfactionNote, setSatisfactionNote] = useState('');
  const [satisfactionBusy, setSatisfactionBusy] = useState(false);
  const [satisfactionMessage, setSatisfactionMessage] = useState<string | null>(null);

  const refreshAll = async () => {
    if (!complaintId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] }),
      queryClient.invalidateQueries({ queryKey: ['complaint-events', complaintId] }),
      queryClient.invalidateQueries({ queryKey: ['complaint-evidence', complaintId] }),
      queryClient.invalidateQueries({ queryKey: ['complaints'] }),
    ]);
  };

  useEffect(() => {
    setIsFollowing(Boolean(complaint?.is_following));
  }, [complaint?.is_following]);

  useEffect(() => {
    if (!complaint) return;
    setAssignDepartment(complaint.assigned_department_key || complaint.department_key || '');
    setEscalateDepartment('');
    setReviewStatus('');
  }, [complaint]);

  const handleFollowToggle = async () => {
    if (!complaintId || !isAuthenticated) return;
    setFollowBusy(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/complaints/${complaintId}/follow`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ notify: true }) : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Failed (${response.status})`);
      }
      setIsFollowing(!isFollowing);
      await refreshAll();
    } catch (followError) {
      console.warn('[complaints] follow toggle failed', followError);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isAuthenticated) return;
    const message = updateMessage.trim();
    if (message.length < 2) {
      setUpdateError(isNe ? 'कम्तीमा २ अक्षर चाहिन्छ।' : 'Please enter at least 2 characters.');
      return;
    }

    setUpdateBusy(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'citizen_update',
          visibility: 'public',
          message,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Failed (${response.status})`);
      }
      setUpdateMessage('');
      setUpdateSuccess(isNe ? 'अपडेट सफलतापूर्वक पठाइयो।' : 'Update submitted successfully.');
      await refreshAll();
    } catch (submitError) {
      setUpdateError(submitError instanceof Error ? submitError.message : 'Failed to submit update.');
    } finally {
      setUpdateBusy(false);
    }
  };

  const handleEvidenceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isAuthenticated) return;
    const note = evidenceNote.trim();
    const sourceUrl = evidenceUrl.trim();
    if (!note && !sourceUrl) {
      setEvidenceError(
        isNe
          ? 'कम्तीमा टिप्पणी वा स्रोत लिङ्क चाहिन्छ।'
          : 'Please add a note or a source URL.',
      );
      return;
    }

    setEvidenceBusy(true);
    setEvidenceError(null);
    setEvidenceSuccess(null);

    try {
      const response = await fetch(`/api/complaints/${complaintId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: sourceUrl || undefined,
          note: note || undefined,
          evidence_type: sourceUrl ? 'link' : 'text',
          language: isNe ? 'ne' : 'en',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || `Failed (${response.status})`);
      }

      setEvidenceNote('');
      setEvidenceUrl('');
      setEvidenceSuccess(
        isNe
          ? 'प्रमाण पठाइयो। समीक्षा पछि सार्वजनिक देखिनेछ।'
          : 'Evidence submitted. It will appear publicly after review.',
      );
      await refreshAll();
    } catch (submitError) {
      setEvidenceError(submitError instanceof Error ? submitError.message : 'Failed to submit evidence.');
    } finally {
      setEvidenceBusy(false);
    }
  };

  const handleReviewerStatusUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isVerifier || !reviewStatus) return;
    setOpsBusy(true);
    setOpsMessage(null);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: reviewStatus,
          event_type: 'status_change',
          visibility: 'public',
          message: reviewMessage.trim() || `Status updated to ${reviewStatus}.`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Failed (${response.status})`);
      setReviewStatus('');
      setReviewMessage('');
      setOpsMessage(isNe ? 'स्थिति अपडेट गरियो।' : 'Status updated.');
      await refreshAll();
    } catch (error) {
      setOpsMessage(error instanceof Error ? error.message : 'Failed to update status.');
    } finally {
      setOpsBusy(false);
    }
  };

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isVerifier || !assignDepartment) return;
    setOpsBusy(true);
    setOpsMessage(null);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_key: assignDepartment,
          assigned_user_id: assignUserId.trim() || null,
          note: assignNote.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Failed (${response.status})`);
      setAssignNote('');
      setOpsMessage(isNe ? 'उजुरी विभागमा assign गरियो।' : 'Complaint assigned.');
      await refreshAll();
    } catch (error) {
      setOpsMessage(error instanceof Error ? error.message : 'Failed to assign complaint.');
    } finally {
      setOpsBusy(false);
    }
  };

  const handleEscalate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isVerifier || !escalateDepartment || !escalateReason.trim()) return;
    setOpsBusy(true);
    setOpsMessage(null);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_department_key: escalateDepartment,
          reason: escalateReason.trim(),
          trigger_type: 'manual',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Failed (${response.status})`);
      setEscalateReason('');
      setOpsMessage(isNe ? 'उजुरी escalate गरियो।' : 'Complaint escalated.');
      await refreshAll();
    } catch (error) {
      setOpsMessage(error instanceof Error ? error.message : 'Failed to escalate complaint.');
    } finally {
      setOpsBusy(false);
    }
  };

  const handleSatisfactionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complaintId || !isAuthenticated) return;
    const rating = parseInt(satisfactionRating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

    setSatisfactionBusy(true);
    setSatisfactionMessage(null);
    try {
      const response = await fetch(`/api/complaints/${complaintId}/satisfaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          note: satisfactionNote.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Failed (${response.status})`);
      setSatisfactionMessage(isNe ? 'धन्यवाद, तपाईंको feedback सुरक्षित भयो।' : 'Thanks, your feedback was saved.');
      await refreshAll();
    } catch (error) {
      setSatisfactionMessage(error instanceof Error ? error.message : 'Failed to submit satisfaction.');
    } finally {
      setSatisfactionBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="public-page">
        <section className="public-section">
          <div className="public-shell">
            <div className="glass-card p-8 text-sm text-gray-300">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              {isNe ? 'लोड हुँदैछ...' : 'Loading civic issue...'}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="public-page">
        <section className="public-section">
          <div className="public-shell">
            <div className="glass-card border border-red-400/30 bg-red-500/10 p-8 text-sm text-red-200">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {error instanceof Error ? error.message : isNe ? 'नागरिक समस्या फेला परेन।' : 'Civic issue not found.'}
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
          <Link
            href="/complaints"
            className="inline-flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {isNe ? 'समस्या सूचीमा फर्कनुहोस्' : 'Back to civic issues'}
          </Link>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/[0.15] bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                    {complaint.status.replace('_', ' ')}
                  </span>
                  <span className="rounded-full border border-primary-400/30 bg-primary-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-primary-200">
                    {complaint.issue_type}
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                    {complaint.trust_level}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {isNe && complaint.title_ne ? complaint.title_ne : complaint.title}
                </h1>
                <p className="mt-2 text-sm text-gray-300">
                  {isNe && complaint.description_ne ? complaint.description_ne : complaint.description}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {isNe ? 'रिपोर्ट गर्ने:' : 'Reported by:'} {complaint.reporter_name || 'Citizen'} ·
                  {' '}
                  {isNe ? 'अन्तिम गतिविधि:' : 'Last activity:'} {formatTime(complaint.last_activity_at)}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {isNe ? 'Assigned:' : 'Assigned:'} {complaint.assigned_department_key || complaint.department_key || 'unassigned'} ·
                  {' '}
                  {isNe ? 'SLA due:' : 'SLA due:'} {complaint.sla_due_at ? formatTime(complaint.sla_due_at) : 'not set'}
                </p>
              </div>

              <button
                disabled={!isAuthenticated || followBusy}
                onClick={handleFollowToggle}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  isFollowing
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                    : 'border-white/[0.15] bg-white/[0.05] text-gray-100 hover:bg-white/[0.1]'
                } disabled:opacity-60`}
              >
                {followBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {isFollowing
                  ? isNe
                    ? 'अनफलो'
                    : 'Unfollow'
                  : isNe
                    ? 'फलो'
                    : 'Follow'}
              </button>
            </div>
          </div>

          {/* Authority Routing Card */}
          {complaint.ai_triage && (complaint.ai_triage as Record<string, unknown>).authorityRoute ? (
            <AuthorityCard route={(complaint.ai_triage as Record<string, unknown>).authorityRoute as Record<string, string>} isNe={isNe} />
          ) : null}

          {/* Cluster Link */}
          {(complaint as unknown as Record<string, unknown>).cluster_id ? (
            <Link
              href={`/complaints/clusters/${(complaint as unknown as Record<string, unknown>).cluster_id as string}`}
              className="glass-card flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-colors"
            >
              <Layers className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  {isNe ? 'AI समूहीकरण' : 'AI duplicate check'}
                </p>
                <p className="text-sm text-white">
                  {isNe
                    ? 'यो रिपोर्ट एउटा ठूलो समस्या क्लस्टरको भाग हो। क्लस्टर हेर्नुहोस् →'
                    : 'This report is part of a larger issue cluster. View cluster →'}
                </p>
              </div>
            </Link>
          ) : null}

          {/* AI Triage Summary */}
          {complaint.ai_triage && (complaint.ai_triage as Record<string, unknown>).summary ? (
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                {isNe ? 'AI सारांश' : 'AI summary'}
              </p>
              <p className="text-sm text-gray-300">
                {String((complaint.ai_triage as Record<string, unknown>).summary)}
              </p>
              {(complaint.ai_triage as Record<string, unknown>).reasoning ? (
                <p className="text-[11px] text-gray-500 mt-1.5 italic">
                  {String((complaint.ai_triage as Record<string, unknown>).reasoning)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={handleUpdateSubmit} className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                {isNe ? 'प्रगति अपडेट' : 'Progress Update'}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                {isNe
                  ? 'समीक्षा आवश्यक स्थिति परिवर्तन बाहेक नागरिक अपडेट थप्न सक्नुहुन्छ।'
                  : 'Add a citizen update. Public status changes still require reviewer action.'}
              </p>
              <textarea
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={4}
                placeholder={isNe ? 'अद्यावधिक लेख्नुहोस्...' : 'Write your update...'}
                className="mt-3 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
              />
              {updateError && (
                <p className="mt-2 text-xs text-red-200">{updateError}</p>
              )}
              {updateSuccess && (
                <p className="mt-2 text-xs text-emerald-200">{updateSuccess}</p>
              )}
              <button
                type="submit"
                disabled={!isAuthenticated || updateBusy}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary-500/40 bg-primary-500/20 px-3 py-2 text-sm font-semibold text-primary-100 transition-colors hover:bg-primary-500/30 disabled:opacity-60"
              >
                {updateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {isNe ? 'अपडेट पठाउनुहोस्' : 'Submit update'}
              </button>
            </form>

            <form onSubmit={handleEvidenceSubmit} className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                {isNe ? 'प्रमाण थप्नुहोस्' : 'Add Evidence'}
              </h2>
              <input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder={isNe ? 'स्रोत लिङ्क (वैकल्पिक)' : 'Source URL (optional)'}
                className="mt-3 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
              />
              <textarea
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                rows={3}
                placeholder={isNe ? 'टिप्पणी वा फोटोलाई वर्णन गर्नुहोस्...' : 'Add a note, context, or witness detail...'}
                className="mt-3 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-primary-500/40 focus:outline-none"
              />
              {evidenceError && (
                <p className="mt-2 text-xs text-red-200">{evidenceError}</p>
              )}
              {evidenceSuccess && (
                <p className="mt-2 text-xs text-emerald-200">{evidenceSuccess}</p>
              )}
              <button
                type="submit"
                disabled={!isAuthenticated || evidenceBusy}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-50 transition-colors hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {evidenceBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {isNe ? 'प्रमाण पठाउनुहोस्' : 'Submit evidence'}
              </button>
            </form>
          </div>

          {isVerifier && (
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                <Shield className="mr-2 inline h-4 w-4" />
                {isNe ? 'Reviewer Operations' : 'Reviewer Operations'}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                {isNe
                  ? 'Status परिवर्तन, assignment, escalation, र SLA workflow यहाँबाट चलाउनुहोस्।'
                  : 'Run status changes, assignment, escalation, and SLA workflow from here.'}
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <form onSubmit={handleReviewerStatusUpdate} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <h3 className="text-sm font-semibold text-white">
                    <Timer className="mr-1 inline h-3.5 w-3.5" />
                    {isNe ? 'Status Update' : 'Status Update'}
                  </h3>
                  <select
                    value={reviewStatus}
                    onChange={(event) => setReviewStatus(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">{isNe ? 'स्थिति चयन' : 'Select status'}</option>
                    {['triaged', 'routed', 'acknowledged', 'in_progress', 'needs_info', 'resolved', 'closed', 'reopened', 'rejected', 'duplicate'].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <textarea
                    value={reviewMessage}
                    onChange={(event) => setReviewMessage(event.target.value)}
                    rows={2}
                    placeholder={isNe ? 'कारण/नोट...' : 'Reason / note...'}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={opsBusy || !reviewStatus}
                    className="mt-2 rounded-lg border border-primary-500/40 bg-primary-500/20 px-3 py-1.5 text-xs font-semibold text-primary-100 hover:bg-primary-500/30 disabled:opacity-60"
                  >
                    {isNe ? 'स्थिति सेभ' : 'Save status'}
                  </button>
                </form>

                <form onSubmit={handleAssign} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <h3 className="text-sm font-semibold text-white">{isNe ? 'Assign Department' : 'Assign Department'}</h3>
                  <select
                    value={assignDepartment}
                    onChange={(event) => setAssignDepartment(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">{isNe ? 'विभाग चयन' : 'Select department'}</option>
                    {(departmentsData?.departments || []).map((dept) => (
                      <option key={dept.key} value={dept.key}>
                        {isNe ? dept.name_ne : dept.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={assignUserId}
                    onChange={(event) => setAssignUserId(event.target.value)}
                    placeholder={isNe ? 'Assignee user ID (optional)' : 'Assignee user ID (optional)'}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                  />
                  <textarea
                    value={assignNote}
                    onChange={(event) => setAssignNote(event.target.value)}
                    rows={2}
                    placeholder={isNe ? 'Assignment note...' : 'Assignment note...'}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={opsBusy || !assignDepartment}
                    className="mt-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/30 disabled:opacity-60"
                  >
                    {isNe ? 'assign गर्नुहोस्' : 'Assign'}
                  </button>
                </form>

                <form onSubmit={handleEscalate} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <h3 className="text-sm font-semibold text-white">{isNe ? 'Escalate' : 'Escalate'}</h3>
                  <select
                    value={escalateDepartment}
                    onChange={(event) => setEscalateDepartment(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">{isNe ? 'Target department' : 'Target department'}</option>
                    {(departmentsData?.departments || []).map((dept) => (
                      <option key={dept.key} value={dept.key}>
                        {isNe ? dept.name_ne : dept.name}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={escalateReason}
                    onChange={(event) => setEscalateReason(event.target.value)}
                    rows={2}
                    placeholder={isNe ? 'Escalation reason...' : 'Escalation reason...'}
                    className="mt-2 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={opsBusy || !escalateDepartment || !escalateReason.trim()}
                    className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-60"
                  >
                    {isNe ? 'escalate' : 'Escalate'}
                  </button>
                </form>
              </div>

              {opsMessage && (
                <p className="mt-3 text-xs text-gray-200">{opsMessage}</p>
              )}
            </div>
          )}

          {isOwner && ['resolved', 'closed'].includes(complaint.status) && (
            <form onSubmit={handleSatisfactionSubmit} className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                {isNe ? 'Resolution Feedback' : 'Resolution Feedback'}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                {isNe ? 'यो केस समाधानको अनुभव रेट गर्नुहोस्।' : 'Rate your experience on how this case was resolved.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={satisfactionRating}
                  onChange={(event) => setSatisfactionRating(event.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={String(value)}>{value}/5</option>
                  ))}
                </select>
                <input
                  value={satisfactionNote}
                  onChange={(event) => setSatisfactionNote(event.target.value)}
                  placeholder={isNe ? 'थप टिप्पणी (optional)' : 'Extra feedback (optional)'}
                  className="min-w-[220px] flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={satisfactionBusy}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
                >
                  {satisfactionBusy ? (isNe ? 'सेभ गर्दै...' : 'Saving...') : isNe ? 'Feedback save' : 'Save feedback'}
                </button>
              </div>
              {satisfactionMessage && (
                <p className="mt-2 text-xs text-gray-200">{satisfactionMessage}</p>
              )}
            </form>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                {isNe ? 'समयरेखा' : 'Timeline'}
              </h2>
              <div className="mt-3 space-y-3">
                {isEventsLoading ? (
                  <p className="text-sm text-gray-400">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    {isNe ? 'लोड हुँदैछ...' : 'Loading events...'}
                  </p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    {isNe ? 'अहिलेसम्म कुनै अपडेट छैन।' : 'No timeline events yet.'}
                  </p>
                ) : (
                  events.map((event) => {
                    // Honest AI labels
                    const actorLabel = event.actor_type === 'ai'
                      ? (event.event_type === 'triaged' ? (isNe ? 'AI वर्गीकरण' : 'AI category prediction')
                        : event.event_type === 'routed' ? (isNe ? 'AI रुटिङ सुझाव' : 'AI routing suggestion')
                        : event.event_type === 'duplicate_marked' ? (isNe ? 'AI डुप्लिकेट जाँच' : 'AI duplicate check')
                        : (isNe ? 'AI' : 'AI'))
                      : event.actor_name || (event.actor_type === 'system' ? 'System' : 'Citizen');

                    return (
                      <div key={event.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                        <p className="text-sm text-white">{event.message}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                          {event.event_type.replace('_', ' ')} · {actorLabel} · {formatTime(event.created_at)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white">
                {isNe ? 'संलग्न प्रमाण' : 'Evidence'}
              </h2>
              <div className="mt-3 space-y-3">
                {isEvidenceLoading ? (
                  <p className="text-sm text-gray-400">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    {isNe ? 'लोड हुँदैछ...' : 'Loading evidence...'}
                  </p>
                ) : evidence.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    {isNe ? 'अहिलेसम्म प्रमाण छैन।' : 'No evidence yet.'}
                  </p>
                ) : (
                  evidence.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      {item.note && <p className="text-sm text-white">{item.note}</p>}
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block truncate text-xs text-cyan-200 hover:text-cyan-100"
                        >
                          {item.source_url}
                        </a>
                      )}
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-gray-400">
                        {item.evidence_type} · {
                          item.verification_status === 'approved'
                            ? (isNe ? 'समुदायद्वारा समीक्षित' : 'community reviewed')
                            : item.verification_status === 'pending'
                              ? (isNe ? 'समीक्षा बाँकी' : 'pending review')
                              : item.verification_status
                        } · {formatTime(item.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
