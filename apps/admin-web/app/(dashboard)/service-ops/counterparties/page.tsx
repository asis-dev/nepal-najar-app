'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Cable, Edit3, Loader2, Link2, Mail, Phone, Plus, Trash2, Workflow } from 'lucide-react';
import { COUNTERPARTY_MODE_LABELS, COUNTERPARTY_STAGE_LABELS } from '@/lib/service-ops/counterparty-types';

type Department = {
  key: string;
  name: string;
};

type Counterparty = {
  id: string;
  key: string;
  name: string;
  department_key: string;
  kind: string;
  authority_level: string;
  jurisdiction_scope?: string | null;
  service_category?: string | null;
  adoption_stage: keyof typeof COUNTERPARTY_STAGE_LABELS;
  default_submission_mode: keyof typeof COUNTERPARTY_MODE_LABELS;
  default_response_mode: keyof typeof COUNTERPARTY_MODE_LABELS;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  route_count: number;
  channel_count: number;
};

type CounterpartyDetail = {
  counterparty: Counterparty & {
    channels: Array<Record<string, any>>;
    routes: Array<Record<string, any>>;
  };
  route_health: Array<{
    route_id: string;
    service_slug: string;
    open_tasks: number;
    breached_tasks: number;
    warning_tasks: number;
    follow_up_due_tasks: number;
    latest_task_update?: string | null;
    health_state: 'healthy' | 'warning' | 'breached';
    sla_target_hours?: number | null;
    sla_warning_hours?: number | null;
    auto_follow_up: boolean;
    follow_up_interval_hours?: number | null;
    escalation_policy?: string | null;
  }>;
  route_health_summary?: {
    total_routes: number;
    healthy_routes: number;
    warning_routes: number;
    breached_routes: number;
    total_open_tasks: number;
    total_breached_tasks: number;
    total_follow_up_due_tasks: number;
  };
  reply_token_stats?: {
    total: number;
    active: number;
    expired: number;
    exhausted: number;
    revoked: number;
  };
  recent_partner_replies?: Array<{
    id: string;
    task_id: string;
    reply_type: string;
    content?: string | null;
    new_status?: string | null;
    created_at: string;
  }>;
};

type Summary = {
  counterparties_total: number;
  active_counterparties: number;
  pilot_counterparties: number;
  blocked_counterparties: number;
  direct_api_routes: number;
  inbox_routes: number;
  human_bridge_routes: number;
  status_sync_routes: number;
  payment_confirmation_routes: number;
};

const STAGE_OPTIONS = Object.entries(COUNTERPARTY_STAGE_LABELS);
const MODE_OPTIONS = Object.entries(COUNTERPARTY_MODE_LABELS);

export default function ServiceOpsCounterpartiesPage() {
  const queryClient = useQueryClient();
  const [departmentKey, setDepartmentKey] = useState('all');
  const [adoptionStage, setAdoptionStage] = useState('all');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [kind, setKind] = useState('government');
  const [submissionMode, setSubmissionMode] = useState<keyof typeof COUNTERPARTY_MODE_LABELS>('department_inbox');
  const [responseMode, setResponseMode] = useState<keyof typeof COUNTERPARTY_MODE_LABELS>('department_inbox');
  const [notes, setNotes] = useState('');
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | null>(null);
  const [channelLabel, setChannelLabel] = useState('');
  const [channelType, setChannelType] = useState('inbox');
  const [channelEndpoint, setChannelEndpoint] = useState('');
  const [routeServiceSlug, setRouteServiceSlug] = useState('');
  const [routeSubmissionMode, setRouteSubmissionMode] = useState<keyof typeof COUNTERPARTY_MODE_LABELS>('department_inbox');
  const [routeResponseMode, setRouteResponseMode] = useState<keyof typeof COUNTERPARTY_MODE_LABELS>('department_inbox');
  const [routeStrategy, setRouteStrategy] = useState('');
  const [routeSlaHours, setRouteSlaHours] = useState('');
  const [routeWarningHours, setRouteWarningHours] = useState('');
  const [routeEscalation, setRouteEscalation] = useState('none');
  const [routeAutoFollowUp, setRouteAutoFollowUp] = useState(false);
  const [routeFollowUpInterval, setRouteFollowUpInterval] = useState('48');
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [replyTokenTaskId, setReplyTokenTaskId] = useState('');
  const [replyTokenUrl, setReplyTokenUrl] = useState<string | null>(null);

  const { data: departmentsData } = useQuery<{ departments: Department[] }>({
    queryKey: ['service-ops-departments'],
    queryFn: async () => {
      const res = await fetch('/api/ops/service-tasks/departments');
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const departments = departmentsData?.departments || [];
  const effectiveDepartmentKey = departmentKey !== 'all' ? departmentKey : departments[0]?.key || '';

  const { data, isLoading } = useQuery<{ counterparties: Counterparty[]; summary: Summary }>({
    queryKey: ['service-ops-counterparties', departmentKey, adoptionStage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentKey !== 'all') params.set('department_key', departmentKey);
      if (adoptionStage !== 'all') params.set('adoption_stage', adoptionStage);
      const res = await fetch(`/api/ops/counterparties?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load counterparties');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/counterparties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_key: effectiveDepartmentKey,
          key,
          name,
          kind,
          adoption_stage: adoptionStage !== 'all' ? adoptionStage : 'identified',
          default_submission_mode: submissionMode,
          default_response_mode: responseMode,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error || 'Failed to create counterparty');
      }
      return res.json();
    },
    onSuccess: () => {
      setName('');
      setKey('');
      setKind('government');
      setSubmissionMode('department_inbox');
      setResponseMode('department_inbox');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparties'] });
    },
  });

  const counterparties = useMemo(() => data?.counterparties || [], [data?.counterparties]);
  const summary = data?.summary;
  const selectedCounterparty = counterparties.find((row) => row.id === selectedCounterpartyId) || counterparties[0] || null;

  const { data: detailData } = useQuery<CounterpartyDetail>({
    queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id],
    enabled: Boolean(selectedCounterparty?.id),
    queryFn: async () => {
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty?.id}`);
      if (!res.ok) throw new Error('Failed to load counterparty detail');
      return res.json();
    },
  });

  const grouped = useMemo(() => {
    return counterparties.reduce<Record<string, Counterparty[]>>((acc, row) => {
      const groupKey = row.department_key || 'unassigned';
      acc[groupKey] = acc[groupKey] || [];
      acc[groupKey].push(row);
      return acc;
    }, {});
  }, [counterparties]);

  const addChannelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCounterparty?.id) throw new Error('No counterparty selected');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: channelLabel,
          channel_type: channelType,
          endpoint: channelEndpoint || undefined,
          supports_status_sync: channelType === 'api' || channelType === 'webhook' || channelType === 'inbox',
          requires_human_bridge: channelType === 'phone' || channelType === 'physical' || channelType === 'email',
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error || 'Failed to add channel');
      }
      return res.json();
    },
    onSuccess: () => {
      setChannelLabel('');
      setChannelType('inbox');
      setChannelEndpoint('');
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id] });
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparties'] });
    },
  });

  const addRouteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCounterparty?.id) throw new Error('No counterparty selected');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_slug: routeServiceSlug,
          submission_mode: routeSubmissionMode,
          response_capture_mode: routeResponseMode,
          is_primary: true,
          supports_document_exchange: true,
          supports_status_updates: routeResponseMode !== 'manual',
          supports_payment_confirmation:
            routeSubmissionMode === 'portal_assisted' ||
            routeSubmissionMode === 'direct_api' ||
            routeResponseMode === 'department_inbox',
          sla_target_hours: routeSlaHours ? parseInt(routeSlaHours) : null,
          sla_warning_hours: routeWarningHours ? parseInt(routeWarningHours) : null,
          escalation_policy: routeEscalation,
          auto_follow_up: routeAutoFollowUp,
          follow_up_interval_hours: routeAutoFollowUp && routeFollowUpInterval ? parseInt(routeFollowUpInterval) : 48,
          metadata: routeStrategy ? { strategy: routeStrategy } : {},
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error || 'Failed to add route');
      }
      return res.json();
    },
    onSuccess: () => {
      setRouteServiceSlug('');
      setRouteSubmissionMode('department_inbox');
      setRouteResponseMode('department_inbox');
      setRouteStrategy('');
      setRouteSlaHours('');
      setRouteWarningHours('');
      setRouteEscalation('none');
      setRouteAutoFollowUp(false);
      setRouteFollowUpInterval('48');
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id] });
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparties'] });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!selectedCounterparty?.id) throw new Error('No counterparty selected');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/channels/${channelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete channel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id] });
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparties'] });
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: async (routeId: string) => {
      if (!selectedCounterparty?.id) throw new Error('No counterparty selected');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/routes/${routeId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete route');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id] });
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparties'] });
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: async ({ routeId, updates }: { routeId: string; updates: Record<string, unknown> }) => {
      if (!selectedCounterparty?.id) throw new Error('No counterparty selected');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update route');
      return res.json();
    },
    onSuccess: () => {
      setEditingRouteId(null);
      queryClient.invalidateQueries({ queryKey: ['service-ops-counterparty-detail', selectedCounterparty?.id] });
    },
  });

  const generateReplyTokenMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCounterparty?.id || !replyTokenTaskId.trim()) throw new Error('Task ID required');
      const res = await fetch(`/api/ops/counterparties/${selectedCounterparty.id}/reply-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: replyTokenTaskId.trim(), scope: 'full', expiry_days: 7, max_uses: 10 }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error || 'Failed to generate token');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setReplyTokenUrl(data.reply_url);
      setReplyTokenTaskId('');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          Service Counterparties
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track which offices, agencies, schools, hospitals, and providers can receive requests, how we send them, and how they send responses back.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-5">
          <MetricCard label="Counterparties" value={summary.counterparties_total} icon={<Building2 className="w-4 h-4 text-violet-400" />} />
          <MetricCard label="Active" value={summary.active_counterparties} icon={<Workflow className="w-4 h-4 text-emerald-400" />} />
          <MetricCard label="Pilot" value={summary.pilot_counterparties} icon={<Cable className="w-4 h-4 text-blue-400" />} />
          <MetricCard label="Inbox Routes" value={summary.inbox_routes} icon={<Workflow className="w-4 h-4 text-cyan-400" />} />
          <MetricCard label="Direct APIs" value={summary.direct_api_routes} icon={<Cable className="w-4 h-4 text-amber-400" />} />
        </div>
      ) : null}

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={departmentKey} onChange={(e) => setDepartmentKey(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department.key} value={department.key}>{department.name}</option>
          ))}
        </select>

        <select className="input w-auto text-sm" value={adoptionStage} onChange={(e) => setAdoptionStage(e.target.value)}>
          <option value="all">All stages</option>
          {STAGE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Add counterparty</h2>

          <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Counterparty name" />
          <input className="input text-sm" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Stable key, e.g. kathmandu-metropolitan-ward-5" />

          <select className="input text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="government">Government body</option>
            <option value="public_institution">Public institution</option>
            <option value="private_institution">Private institution</option>
            <option value="provider">Provider</option>
            <option value="partner">Partner</option>
          </select>

          <select className="input text-sm" value={submissionMode} onChange={(e) => setSubmissionMode(e.target.value as keyof typeof COUNTERPARTY_MODE_LABELS)}>
            {MODE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select className="input text-sm" value={responseMode} onChange={(e) => setResponseMode(e.target.value as keyof typeof COUNTERPARTY_MODE_LABELS)}>
            {MODE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <textarea className="input min-h-28 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What makes this institution different? Who replies? What blocks automation?" />

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !effectiveDepartmentKey || !name.trim() || !key.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save counterparty
          </button>

          {createMutation.error ? <div className="text-sm text-red-400">{(createMutation.error as Error).message}</div> : null}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="glass-card p-10 text-center text-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : counterparties.length === 0 ? (
            <div className="glass-card p-10 text-sm text-gray-400">
              No counterparties added yet for this filter.
            </div>
          ) : (
            Object.entries(grouped).map(([groupKey, rows]) => (
              <div key={groupKey} className="glass-card overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h2 className="text-base font-semibold text-white">
                    {departments.find((department) => department.key === groupKey)?.name || groupKey}
                  </h2>
                </div>

                <div className="divide-y divide-white/[0.06]">
                  {rows.map((counterparty) => (
                    <button
                      key={counterparty.id}
                      onClick={() => setSelectedCounterpartyId(counterparty.id)}
                      className={`w-full text-left px-5 py-4 space-y-3 transition-colors ${selectedCounterparty?.id === counterparty.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-white">{counterparty.name}</div>
                            <span className="rounded-full border border-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                              {COUNTERPARTY_STAGE_LABELS[counterparty.adoption_stage]}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                              {counterparty.kind}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {counterparty.key} · {counterparty.authority_level}
                            {counterparty.jurisdiction_scope ? ` · ${counterparty.jurisdiction_scope}` : ''}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{counterparty.route_count} routes</div>
                          <div>{counterparty.channel_count} channels</div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Submission</div>
                          <div className="text-sm text-white">{COUNTERPARTY_MODE_LABELS[counterparty.default_submission_mode]}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Response</div>
                          <div className="text-sm text-white">{COUNTERPARTY_MODE_LABELS[counterparty.default_response_mode]}</div>
                        </div>
                      </div>

                      {(counterparty.contact_email || counterparty.contact_phone) ? (
                        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                          {counterparty.contact_email ? <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {counterparty.contact_email}</div> : null}
                          {counterparty.contact_phone ? <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {counterparty.contact_phone}</div> : null}
                        </div>
                      ) : null}

                      {counterparty.notes ? (
                        <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-gray-300">
                          {counterparty.notes}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedCounterparty && detailData?.counterparty ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Add channel</h2>
            <div className="text-sm text-gray-400">{detailData.counterparty.name}</div>
            <input className="input text-sm" value={channelLabel} onChange={(e) => setChannelLabel(e.target.value)} placeholder="Channel label" />
            <select className="input text-sm" value={channelType} onChange={(e) => setChannelType(e.target.value)}>
              <option value="api">API</option>
              <option value="portal">Portal</option>
              <option value="inbox">Inbox</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="physical">Physical office</option>
              <option value="webhook">Webhook</option>
            </select>
            <input className="input text-sm" value={channelEndpoint} onChange={(e) => setChannelEndpoint(e.target.value)} placeholder="Endpoint / URL / contact" />
            <button
              onClick={() => addChannelMutation.mutate()}
              disabled={addChannelMutation.isPending || !channelLabel.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {addChannelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save channel
            </button>

            <div className="space-y-2">
              {detailData.counterparty.channels?.map((channel) => (
                <div key={channel.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{channel.label}</div>
                      <div className="text-xs text-gray-500">{channel.channel_type} · {channel.direction}</div>
                    </div>
                    <button
                      onClick={() => deleteChannelMutation.mutate(channel.id)}
                      disabled={deleteChannelMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove channel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {channel.endpoint ? <div className="mt-1 text-xs text-gray-400">{channel.endpoint}</div> : null}
                  <div className="mt-1 flex gap-2 text-[10px]">
                    {channel.supports_status_sync ? <span className="text-emerald-400">status-sync</span> : null}
                    {channel.requires_human_bridge ? <span className="text-amber-400">human-bridge</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Add route</h2>
            <input className="input text-sm" value={routeServiceSlug} onChange={(e) => setRouteServiceSlug(e.target.value)} placeholder="Service slug" />
            <select className="input text-sm" value={routeSubmissionMode} onChange={(e) => setRouteSubmissionMode(e.target.value as keyof typeof COUNTERPARTY_MODE_LABELS)}>
              {MODE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="input text-sm" value={routeResponseMode} onChange={(e) => setRouteResponseMode(e.target.value as keyof typeof COUNTERPARTY_MODE_LABELS)}>
              {MODE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <textarea className="input min-h-24 text-sm" value={routeStrategy} onChange={(e) => setRouteStrategy(e.target.value)} placeholder="Route strategy for staff and AI, e.g. portal-assisted until direct API exists." />

            <div className="border-t border-white/[0.06] pt-3 mt-2">
              <div className="text-xs font-semibold text-gray-400 mb-2">SLA & Escalation</div>
              <div className="grid gap-2 grid-cols-2">
                <input className="input text-sm" value={routeSlaHours} onChange={(e) => setRouteSlaHours(e.target.value)} placeholder="SLA target (hours)" type="number" />
                <input className="input text-sm" value={routeWarningHours} onChange={(e) => setRouteWarningHours(e.target.value)} placeholder="Warning (hours)" type="number" />
              </div>
              <select className="input text-sm mt-2" value={routeEscalation} onChange={(e) => setRouteEscalation(e.target.value)}>
                <option value="none">No escalation</option>
                <option value="notify_manager">Notify manager</option>
                <option value="reassign">Reassign</option>
                <option value="escalate_department">Escalate to department</option>
                <option value="escalate_admin">Escalate to admin</option>
              </select>
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={routeAutoFollowUp} onChange={(e) => setRouteAutoFollowUp(e.target.checked)} className="rounded border-gray-600" />
                Auto follow-up
              </label>
              {routeAutoFollowUp && (
                <input className="input text-sm mt-2" value={routeFollowUpInterval} onChange={(e) => setRouteFollowUpInterval(e.target.value)} placeholder="Follow-up interval (hours)" type="number" />
              )}
            </div>

            <button
              onClick={() => addRouteMutation.mutate()}
              disabled={addRouteMutation.isPending || !routeServiceSlug.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {addRouteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save route
            </button>

            <div className="space-y-2">
              {detailData.counterparty.routes?.map((route) => (
                <div key={route.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{route.service_slug}</div>
                      <div className="text-xs text-gray-500">{route.submission_mode} → {route.response_capture_mode}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingRouteId(editingRouteId === route.id ? null : route.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-400 transition-colors"
                        title="Edit route"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRouteMutation.mutate(route.id)}
                        disabled={deleteRouteMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {route.sla_target_hours ? (
                    <div className="mt-1 text-[10px] text-amber-400">
                      SLA: {route.sla_target_hours}h · {route.escalation_policy !== 'none' ? route.escalation_policy.replace(/_/g, ' ') : 'no escalation'}
                      {route.auto_follow_up ? ` · follow-up every ${route.follow_up_interval_hours}h` : ''}
                    </div>
                  ) : null}
                  {route.metadata?.strategy ? <div className="mt-1 text-xs text-gray-400">{route.metadata.strategy}</div> : null}

                  {editingRouteId === route.id && (
                    <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                      <div className="grid gap-2 grid-cols-2">
                        <input className="input text-xs" defaultValue={route.sla_target_hours || ''} id={`sla-${route.id}`} placeholder="SLA hours" type="number" />
                        <input className="input text-xs" defaultValue={route.sla_warning_hours || ''} id={`warn-${route.id}`} placeholder="Warning hours" type="number" />
                      </div>
                      <select className="input text-xs" defaultValue={route.escalation_policy || 'none'} id={`esc-${route.id}`}>
                        <option value="none">No escalation</option>
                        <option value="notify_manager">Notify manager</option>
                        <option value="reassign">Reassign</option>
                        <option value="escalate_department">Escalate to department</option>
                        <option value="escalate_admin">Escalate to admin</option>
                      </select>
                      <button
                        onClick={() => {
                          const sla = (document.getElementById(`sla-${route.id}`) as HTMLInputElement)?.value;
                          const warn = (document.getElementById(`warn-${route.id}`) as HTMLInputElement)?.value;
                          const esc = (document.getElementById(`esc-${route.id}`) as HTMLSelectElement)?.value;
                          updateRouteMutation.mutate({
                            routeId: route.id,
                            updates: {
                              sla_target_hours: sla ? parseInt(sla) : null,
                              sla_warning_hours: warn ? parseInt(warn) : null,
                              escalation_policy: esc || 'none',
                            },
                          });
                        }}
                        disabled={updateRouteMutation.isPending}
                        className="btn-primary text-xs w-full"
                      >
                        {updateRouteMutation.isPending ? 'Saving...' : 'Save SLA changes'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Route health</h2>
            {detailData.route_health_summary ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Open tasks" value={detailData.route_health_summary.total_open_tasks} icon={<Workflow className="w-4 h-4 text-cyan-400" />} />
                <MetricCard label="Breached" value={detailData.route_health_summary.total_breached_tasks} icon={<Cable className="w-4 h-4 text-red-400" />} />
                <MetricCard label="Follow-up due" value={detailData.route_health_summary.total_follow_up_due_tasks} icon={<Link2 className="w-4 h-4 text-amber-400" />} />
              </div>
            ) : null}
            <div className="space-y-2">
              {(detailData.route_health || []).length === 0 ? (
                <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-gray-400">
                  No active routes to monitor yet.
                </div>
              ) : (
                detailData.route_health.map((route) => (
                  <div key={route.route_id} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{route.service_slug}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {route.sla_target_hours ? `SLA ${route.sla_target_hours}h` : 'No SLA'}
                          {route.escalation_policy && route.escalation_policy !== 'none' ? ` · ${route.escalation_policy.replace(/_/g, ' ')}` : ''}
                        </div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        route.health_state === 'breached'
                          ? 'border-red-500/30 text-red-300'
                          : route.health_state === 'warning'
                            ? 'border-amber-500/30 text-amber-300'
                            : 'border-emerald-500/30 text-emerald-300'
                      }`}>
                        {route.health_state}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs text-gray-300">
                      <div>Open: {route.open_tasks}</div>
                      <div>Breached: {route.breached_tasks}</div>
                      <div>Warning: {route.warning_tasks}</div>
                      <div>Follow-up due: {route.follow_up_due_tasks}</div>
                    </div>
                    {route.latest_task_update ? (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Latest task activity {new Date(route.latest_task_update).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reply Token Generator */}
          <div className="glass-card p-5 space-y-4 xl:col-span-2">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-violet-400" />
              Partner reply link
            </h2>
            <p className="text-xs text-gray-400">
              Generate a link that lets this counterparty respond to a specific case without logging in. They can add notes, update status, or approve/reject.
            </p>
            <div className="flex gap-2">
              <input
                className="input text-sm flex-1"
                value={replyTokenTaskId}
                onChange={(e) => setReplyTokenTaskId(e.target.value)}
                placeholder="Task ID (paste from the task detail page)"
              />
              <button
                onClick={() => generateReplyTokenMutation.mutate()}
                disabled={generateReplyTokenMutation.isPending || !replyTokenTaskId.trim()}
                className="btn-primary flex items-center gap-2 shrink-0"
              >
                {generateReplyTokenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Generate
              </button>
            </div>
            {generateReplyTokenMutation.error ? (
              <div className="text-sm text-red-400">{(generateReplyTokenMutation.error as Error).message}</div>
            ) : null}
            {replyTokenUrl && (
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-3">
                <div className="text-xs text-violet-300 mb-1">Reply link generated — share this with the counterparty:</div>
                <div className="text-sm text-white break-all font-mono bg-black/30 rounded-lg p-2">{replyTokenUrl}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(replyTokenUrl); }}
                  className="mt-2 text-xs text-violet-300 hover:text-violet-200 underline"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
            {detailData.reply_token_stats ? (
              <div className="grid gap-3 sm:grid-cols-5">
                <MetricCard label="Tokens" value={detailData.reply_token_stats.total} icon={<Link2 className="w-4 h-4 text-violet-400" />} />
                <MetricCard label="Active" value={detailData.reply_token_stats.active} icon={<Link2 className="w-4 h-4 text-emerald-400" />} />
                <MetricCard label="Expired" value={detailData.reply_token_stats.expired} icon={<Link2 className="w-4 h-4 text-amber-400" />} />
                <MetricCard label="Exhausted" value={detailData.reply_token_stats.exhausted} icon={<Link2 className="w-4 h-4 text-red-400" />} />
                <MetricCard label="Revoked" value={detailData.reply_token_stats.revoked} icon={<Link2 className="w-4 h-4 text-gray-400" />} />
              </div>
            ) : null}
            {(detailData.recent_partner_replies || []).length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent partner replies</div>
                {detailData.recent_partner_replies?.map((reply) => (
                  <div key={reply.id} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-violet-300">{reply.reply_type.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-gray-500">{new Date(reply.created_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-gray-200">{reply.content || 'No message body'}</div>
                    {reply.new_status ? (
                      <div className="mt-1 text-[11px] text-cyan-200/90">Status update: {reply.new_status.replace(/_/g, ' ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
