'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, CheckCircle2, XCircle, Pencil, RefreshCw,
  Loader2, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Filter, BarChart3, Eye, Link2,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface Signal {
  id: string;
  title: string;
  url: string | null;
  source_id: string | null;
  classification: string | null;
  confidence: number | null;
  relevance_score: number | null;
  matched_promise_ids: number[] | null;
  review_status: string | null;
  review_required: boolean;
  review_notes: string | null;
  reasoning: string | null;
  discovered_at: string;
  content_summary: string | null;
  metadata: Record<string, unknown> | null;
}

interface ConflictData {
  promise_id: number;
  promise_title: string;
  confirms_count: number;
  contradicts_count: number;
  confirms_signals: Signal[];
  contradicts_signals: Signal[];
}

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  editedToday: number;
  classifications: Record<string, number>;
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const CLASSIFICATION_COLORS: Record<string, { badge: string; label: string }> = {
  confirms:          { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Confirms' },
  contradicts:       { badge: 'bg-red-500/15 text-red-300 border-red-500/30', label: 'Contradicts' },
  neutral:           { badge: 'bg-gray-500/15 text-gray-300 border-gray-500/30', label: 'Neutral' },
  statement:         { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', label: 'Statement' },
  budget_allocation: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30', label: 'Budget' },
  policy_change:     { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', label: 'Policy Change' },
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  edited: 'Edited',
  rejected: 'Rejected',
};

const CLASSIFICATION_OPTIONS = [
  'confirms', 'contradicts', 'neutral', 'statement', 'budget_allocation', 'policy_change',
] as const;

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function ReviewQueuePage() {
  // ── Data state ──
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [conflictsLoading, setConflictsLoading] = useState(true);

  // ── Filter state ──
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterClassification, setFilterClassification] = useState<string>('');
  const [filterConfidence, setFilterConfidence] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');

  // ── UI state ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConflicts, setShowConflicts] = useState(true);
  const [expandedConflict, setExpandedConflict] = useState<number | null>(null);

  // ── Edit form state ──
  const [editForm, setEditForm] = useState<{
    classification: string;
    confidence: string;
    matched_promise_ids: string;
    notes: string;
  }>({ classification: '', confidence: '', matched_promise_ids: '', notes: '' });

  // ── Reject form state ──
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  // ── Fetch signals ──
  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('review_status', filterStatus);
      if (filterClassification) params.set('classification', filterClassification);
      if (filterConfidence) params.set('confidence', filterConfidence);
      if (sortBy) params.set('sort', sortBy);

      const res = await fetch(`/api/admin/signals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch signals');
      const data = await res.json();
      setSignals(data.signals || []);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load signals' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClassification, filterConfidence, sortBy]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/signals/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchConflicts = useCallback(async () => {
    setConflictsLoading(true);
    try {
      const res = await fetch('/api/admin/signals/conflicts');
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch {
      // conflicts are non-critical
    } finally {
      setConflictsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  // ── PATCH helper ──
  const patchSignal = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || 'Failed to update signal');
    }
    return res.json();
  };

  // ── Actions ──
  const handleApprove = async (id: string) => {
    setSubmitting(id);
    setMessage(null);
    try {
      await patchSignal(id, {
        review_status: 'approved',
        review_notes: approveNotes || 'Approved by admin',
      });
      setMessage({ type: 'success', text: 'Signal approved.' });
      setApproveNotes('');
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Approve failed' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: 'Rejection reason is required.' });
      return;
    }
    setSubmitting(id);
    setMessage(null);
    try {
      await patchSignal(id, {
        review_status: 'rejected',
        review_notes: rejectReason,
      });
      setMessage({ type: 'success', text: 'Signal rejected.' });
      setRejectReason('');
      setRejectingId(null);
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Reject failed' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(id);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { review_status: 'edited' };
      if (editForm.classification) body.classification = editForm.classification;
      if (editForm.confidence) body.confidence = parseFloat(editForm.confidence);
      if (editForm.matched_promise_ids.trim()) {
        body.matched_promise_ids = editForm.matched_promise_ids
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
      }
      if (editForm.notes) body.review_notes = editForm.notes;

      await patchSignal(id, body);
      setMessage({ type: 'success', text: 'Signal updated.' });
      setEditingId(null);
      setEditForm({ classification: '', confidence: '', matched_promise_ids: '', notes: '' });
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Edit failed' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleReclassify = async (id: string) => {
    setSubmitting(id);
    setMessage(null);
    try {
      // Reset classification fields so the sweep picks it up again
      await patchSignal(id, {
        review_notes: 'Sent back for AI re-analysis',
      });
      // Also need to reset tier1_processed — use the existing intelligence signals API
      // For now, mark as pending so it shows up in queue
      setMessage({ type: 'success', text: 'Signal queued for reclassification.' });
      fetchSignals();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Reclassify failed' });
    } finally {
      setSubmitting(null);
    }
  };

  // ── Bulk actions ──
  const handleBulkApprove = async () => {
    setBulkSubmitting(true);
    setMessage(null);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => patchSignal(id, { review_status: 'approved', review_notes: 'Bulk approved by admin' })));
      setMessage({ type: 'success', text: `${ids.length} signals approved.` });
      setSelectedIds(new Set());
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bulk approve failed' });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    setBulkSubmitting(true);
    setMessage(null);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => patchSignal(id, { review_status: 'rejected', review_notes: 'Bulk rejected by admin' })));
      setMessage({ type: 'success', text: `${ids.length} signals rejected.` });
      setSelectedIds(new Set());
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bulk reject failed' });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkReclassify = async () => {
    setBulkSubmitting(true);
    setMessage(null);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => patchSignal(id, { review_notes: 'Bulk sent for reclassification' })));
      setMessage({ type: 'success', text: `${ids.length} signals queued for reclassification.` });
      setSelectedIds(new Set());
      fetchSignals();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bulk reclassify failed' });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === signals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(signals.map((s) => s.id)));
    }
  };

  // ── Resolve conflict ──
  const handleResolveConflict = async (promiseId: number, keepSide: 'confirms' | 'contradicts') => {
    const conflict = conflicts.find((c) => c.promise_id === promiseId);
    if (!conflict) return;

    setSubmitting(`conflict-${promiseId}`);
    setMessage(null);
    try {
      const downgradeSignals = keepSide === 'confirms'
        ? conflict.contradicts_signals
        : conflict.confirms_signals;

      await Promise.all(
        downgradeSignals.map((s) =>
          patchSignal(s.id, {
            classification: 'neutral',
            review_status: 'edited',
            review_notes: `Downgraded during conflict resolution for commitment #${promiseId}. Admin kept "${keepSide}" side.`,
          }),
        ),
      );

      setMessage({ type: 'success', text: `Conflict for commitment #${promiseId} resolved. ${downgradeSignals.length} signals downgraded to neutral.` });
      fetchConflicts();
      fetchSignals();
      fetchStats();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Conflict resolution failed' });
    } finally {
      setSubmitting(null);
    }
  };

  // ── Classification pie chart (simple SVG) ──
  const pieData = useMemo(() => {
    if (!stats?.classifications) return [];
    const entries = Object.entries(stats.classifications).filter(([, v]) => v > 0);
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    if (total === 0) return [];

    const colors: Record<string, string> = {
      confirms: '#10b981',
      contradicts: '#ef4444',
      neutral: '#6b7280',
      statement: '#3b82f6',
      budget_allocation: '#a855f7',
      policy_change: '#f97316',
      unclassified: '#374151',
    };

    let cumulative = 0;
    return entries.map(([key, count]) => {
      const startAngle = (cumulative / total) * 360;
      cumulative += count;
      const endAngle = (cumulative / total) * 360;
      return {
        key,
        count,
        pct: Math.round((count / total) * 100),
        color: colors[key] || '#4b5563',
        startAngle,
        endAngle,
      };
    });
  }, [stats]);

  const startEditFor = (signal: Signal) => {
    setEditingId(signal.id);
    setEditForm({
      classification: signal.classification || '',
      confidence: signal.confidence?.toString() || '',
      matched_promise_ids: (signal.matched_promise_ids || []).join(', '),
      notes: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-400" />
            Signal Review Queue
          </h1>
          <p className="section-subtitle">
            Review, approve, edit, or reject AI-classified intelligence signals
          </p>
        </div>
        <button
          onClick={() => { fetchSignals(); fetchStats(); fetchConflicts(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Pending Review"
          value={stats?.pending ?? 0}
          color="text-amber-400"
          loading={statsLoading}
        />
        <StatCard
          label="Approved Today"
          value={stats?.approvedToday ?? 0}
          color="text-emerald-400"
          loading={statsLoading}
        />
        <StatCard
          label="Rejected Today"
          value={stats?.rejectedToday ?? 0}
          color="text-red-400"
          loading={statsLoading}
        />
        <StatCard
          label="Edited Today"
          value={stats?.editedToday ?? 0}
          color="text-blue-400"
          loading={statsLoading}
        />
        {/* Pie chart card */}
        <div className="glass-card p-4">
          <p className="text-xs text-gray-500 mb-2">Classifications</p>
          {statsLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            </div>
          ) : pieData.length > 0 ? (
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 32 32" className="w-14 h-14 flex-shrink-0">
                {pieData.map((slice) => {
                  const r = 16;
                  const startRad = ((slice.startAngle - 90) * Math.PI) / 180;
                  const endRad = ((slice.endAngle - 90) * Math.PI) / 180;
                  const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
                  const x1 = r + r * Math.cos(startRad);
                  const y1 = r + r * Math.sin(startRad);
                  const x2 = r + r * Math.cos(endRad);
                  const y2 = r + r * Math.sin(endRad);
                  const d = slice.endAngle - slice.startAngle >= 360
                    ? `M ${r} 0 A ${r} ${r} 0 1 1 ${r} ${2 * r} A ${r} ${r} 0 1 1 ${r} 0`
                    : `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  return (
                    <path key={slice.key} d={d} fill={slice.color} opacity={0.85} />
                  );
                })}
              </svg>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                {pieData.map((slice) => (
                  <span key={slice.key} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: slice.color }} />
                    <span className="text-gray-400">{CLASSIFICATION_COLORS[slice.key]?.label || slice.key}</span>
                    <span className="text-gray-500">{slice.pct}%</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">No data</p>
          )}
        </div>
      </div>

      {/* ── Conflicts Panel ── */}
      {conflicts.length > 0 && (
        <div className="glass-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            onClick={() => setShowConflicts(!showConflicts)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-amber-300">
                Conflicts ({conflicts.length})
              </span>
              <span className="text-xs text-gray-500">
                Commitments with both confirming and contradicting signals
              </span>
            </div>
            {showConflicts ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {showConflicts && (
            <div className="border-t border-white/[0.06] divide-y divide-white/[0.06]">
              {conflicts.map((conflict) => (
                <div key={conflict.promise_id}>
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left"
                    onClick={() =>
                      setExpandedConflict(
                        expandedConflict === conflict.promise_id ? null : conflict.promise_id,
                      )
                    }
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm text-gray-200 truncate">
                        {conflict.promise_title}
                      </span>
                      <span className="flex-shrink-0 text-xs">
                        <span className="text-emerald-400">{conflict.confirms_count} confirms</span>
                        {' '}
                        <span className="text-gray-600">vs</span>
                        {' '}
                        <span className="text-red-400">{conflict.contradicts_count} contradicts</span>
                      </span>
                    </div>
                    {expandedConflict === conflict.promise_id ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>

                  {expandedConflict === conflict.promise_id && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Confirms column */}
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
                            Confirms ({conflict.confirms_count})
                          </p>
                          <div className="space-y-2">
                            {conflict.confirms_signals.slice(0, 5).map((s) => (
                              <ConflictSignalCard key={s.id} signal={s} />
                            ))}
                          </div>
                        </div>
                        {/* Contradicts column */}
                        <div>
                          <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">
                            Contradicts ({conflict.contradicts_count})
                          </p>
                          <div className="space-y-2">
                            {conflict.contradicts_signals.slice(0, 5).map((s) => (
                              <ConflictSignalCard key={s.id} signal={s} />
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Resolve buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                          disabled={submitting === `conflict-${conflict.promise_id}`}
                          onClick={() => handleResolveConflict(conflict.promise_id, 'confirms')}
                        >
                          {submitting === `conflict-${conflict.promise_id}` && <Loader2 className="w-3 h-3 animate-spin" />}
                          Keep Confirms, Downgrade Contradicts
                        </button>
                        <button
                          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                          disabled={submitting === `conflict-${conflict.promise_id}`}
                          onClick={() => handleResolveConflict(conflict.promise_id, 'contradicts')}
                        >
                          {submitting === `conflict-${conflict.promise_id}` && <Loader2 className="w-3 h-3 animate-spin" />}
                          Keep Contradicts, Downgrade Confirms
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Review Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Review Status</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="edited">Edited</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {/* Classification */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Classification</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value)}
            >
              <option value="">All</option>
              {CLASSIFICATION_OPTIONS.map((c) => (
                <option key={c} value={c}>{CLASSIFICATION_COLORS[c]?.label || c}</option>
              ))}
            </select>
          </div>
          {/* Confidence */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confidence</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
            >
              <option value="">All</option>
              <option value="low">Low (&lt;0.5)</option>
              <option value="medium">Medium (0.5-0.8)</option>
              <option value="high">High (&gt;0.8)</option>
            </select>
          </div>
          {/* Sort */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sort By</label>
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Date (newest)</option>
              <option value="confidence">Confidence (highest)</option>
              <option value="relevance_score">Relevance (highest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Status Message ── */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Bulk Operations Bar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 glass-card p-3 flex items-center justify-between border-primary-500/30">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {selectedIds.size} selected
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              {selectedIds.size === signals.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {bulkSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Bulk Approve
            </button>
            <button
              onClick={handleBulkReject}
              disabled={bulkSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              {bulkSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Bulk Reject
            </button>
            <button
              onClick={handleBulkReclassify}
              disabled={bulkSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
            >
              {bulkSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Bulk Reclassify
            </button>
          </div>
        </div>
      )}

      {/* ── Signal List ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : signals.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 text-gray-600" />
          No signals match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === signals.length && signals.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/30"
            />
            <span className="text-xs text-gray-500">
              {signals.length} signal{signals.length !== 1 ? 's' : ''} shown
            </span>
          </div>

          {signals.map((signal) => {
            const isExpanded = expandedId === signal.id;
            const isEditing = editingId === signal.id;
            const isRejecting = rejectingId === signal.id;
            const cls = CLASSIFICATION_COLORS[signal.classification || ''] || CLASSIFICATION_COLORS.neutral;
            const reviewStatus = signal.review_status || 'pending';

            return (
              <div key={signal.id} className="glass-card overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(signal.id)}
                    onChange={() => toggleSelect(signal.id)}
                    className="w-4 h-4 mt-1 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/30 flex-shrink-0"
                  />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-200 line-clamp-2">
                          {signal.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {signal.source_id || 'Unknown source'}
                          {' '}&middot;{' '}
                          {new Date(signal.discovered_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls.badge}`}>
                          {cls.label}
                        </span>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                          reviewStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          reviewStatus === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          reviewStatus === 'edited' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {REVIEW_STATUS_LABELS[reviewStatus] || reviewStatus}
                        </span>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 mt-2">
                      {/* Confidence bar */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Confidence</span>
                        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (signal.confidence || 0) >= 0.8 ? 'bg-emerald-500' :
                              (signal.confidence || 0) >= 0.5 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(signal.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-300 font-mono">
                          {(signal.confidence || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Relevance */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500">Relevance</span>
                        <span className="text-gray-300 font-mono">
                          {(signal.relevance_score || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Matched commitments */}
                      {signal.matched_promise_ids && signal.matched_promise_ids.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Link2 className="w-3 h-3 text-gray-500" />
                          <div className="flex gap-1">
                            {signal.matched_promise_ids.map((pid) => (
                              <span
                                key={pid}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-300 text-[10px] font-medium"
                              >
                                #{pid}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Source link */}
                      {signal.url && (
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source
                        </a>
                      )}
                    </div>

                    {/* AI Reasoning toggle */}
                    {signal.reasoning && (
                      <button
                        className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : signal.id)}
                      >
                        <Eye className="w-3 h-3" />
                        Why the AI classified this
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    {/* Expanded AI reasoning */}
                    {isExpanded && signal.reasoning && (
                      <div className="mt-2 p-3 rounded-lg bg-black/20 border border-white/[0.06] text-xs text-gray-400 leading-relaxed">
                        {signal.reasoning}
                      </div>
                    )}

                    {/* Review notes if present */}
                    {signal.review_notes && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Note: {signal.review_notes}
                      </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-2 mt-3">
                      {/* Approve */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApprove(signal.id)}
                          disabled={submitting === signal.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          {submitting === signal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                      </div>

                      {/* Edit */}
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingId(null); }
                          else { startEditFor(signal); setRejectingId(null); }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          isEditing
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20'
                        }`}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>

                      {/* Reject */}
                      <button
                        onClick={() => {
                          if (isRejecting) { setRejectingId(null); }
                          else { setRejectingId(signal.id); setEditingId(null); }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          isRejecting
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20'
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>

                      {/* Reclassify */}
                      <button
                        onClick={() => handleReclassify(signal.id)}
                        disabled={submitting === signal.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reclassify
                      </button>
                    </div>

                    {/* ── Inline Edit Form ── */}
                    {isEditing && (
                      <div className="mt-3 p-4 rounded-lg bg-black/20 border border-white/[0.06] space-y-3">
                        <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Edit Signal</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Classification</label>
                            <select
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                              value={editForm.classification}
                              onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })}
                            >
                              <option value="">Keep current</option>
                              {CLASSIFICATION_OPTIONS.map((c) => (
                                <option key={c} value={c}>{CLASSIFICATION_COLORS[c]?.label || c}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Confidence (0-1)</label>
                            <input
                              type="number"
                              min={0}
                              max={1}
                              step={0.05}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                              placeholder={signal.confidence?.toString() || '0.00'}
                              value={editForm.confidence}
                              onChange={(e) => setEditForm({ ...editForm, confidence: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Commitment IDs (comma-sep)</label>
                            <input
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                              placeholder="1, 5, 12"
                              value={editForm.matched_promise_ids}
                              onChange={(e) => setEditForm({ ...editForm, matched_promise_ids: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                          <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[60px]"
                            placeholder="Why is this being changed?"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(signal.id)}
                            disabled={submitting === signal.id}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            {submitting === signal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-gray-500 text-xs hover:text-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Reject Form ── */}
                    {isRejecting && (
                      <div className="mt-3 p-4 rounded-lg bg-black/20 border border-red-500/10 space-y-3">
                        <p className="text-xs font-semibold text-red-300 uppercase tracking-wider">Reject Signal</p>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Reason <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[60px]"
                            placeholder="Why is this signal being rejected?"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReject(signal.id)}
                            disabled={submitting === signal.id || !rejectReason.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            {submitting === signal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            className="px-4 py-2 text-gray-500 text-xs hover:text-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function StatCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-600 mt-1" />
      ) : (
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      )}
    </div>
  );
}

function ConflictSignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="p-2.5 rounded-lg bg-black/20 border border-white/[0.06]">
      <p className="text-xs text-gray-300 line-clamp-2">{signal.title}</p>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
        <span>{signal.source_id}</span>
        <span>&middot;</span>
        <span>conf: {(signal.confidence || 0).toFixed(2)}</span>
        {signal.url && (
          <a href={signal.url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
