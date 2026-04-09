'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { generateICS, downloadICS } from '@/lib/services/calendar-export';

type Application = {
  id: string;
  service_slug: string;
  service_title: string;
  reference_no?: string;
  office_name?: string;
  portal_url?: string;
  amount_npr?: number;
  paid?: boolean;
  paid_on?: string;
  receipt_no?: string;
  submitted_on?: string;
  expected_on?: string;
  completed_on?: string;
  status: string;
  last_status_note?: string;
  reminder_on?: string;
  reminder_sent?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  started: { label: 'Started', color: 'bg-zinc-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  submitted: { label: 'Submitted', color: 'bg-indigo-500' },
  pending_payment: { label: 'Pending Payment', color: 'bg-amber-500' },
  pending_visit: { label: 'Visit Required', color: 'bg-orange-500' },
  ready_pickup: { label: 'Ready for Pickup', color: 'bg-emerald-500' },
  completed: { label: 'Completed', color: 'bg-green-600' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'bg-zinc-500' },
};

export function ApplicationsDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState<Partial<Application>>({});

  async function load() {
    try {
      const r = await fetch('/api/me/applications');
      const j = await r.json();
      setApps(j.applications || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const body = editing?.id ? { ...form, id: editing.id } : form;
    await fetch('/api/me/applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setEditing(null);
    setForm({});
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this application?')) return;
    await fetch(`/api/me/applications?id=${id}`, { method: 'DELETE' });
    load();
  }

  function exportCalendar(app: Application) {
    const date = app.reminder_on || app.expected_on;
    if (!date) { alert('No date set for this application.'); return; }
    const ics = generateICS({
      title: `${app.service_title} — ${app.status === 'ready_pickup' ? 'Pickup' : 'Follow up'}`,
      description: `Reference: ${app.reference_no || 'N/A'}\nOffice: ${app.office_name || 'N/A'}\nNotes: ${app.notes || ''}`,
      location: app.office_name,
      startDate: new Date(date),
    });
    downloadICS(`nepal-republic-${app.service_slug}`, ics);
  }

  const completedCount = apps.filter((a) => a.status === 'completed' || a.status === 'submitted').length;
  const hoursSaved = completedCount * 3;
  const activeCount = apps.filter((a) => !['completed', 'cancelled', 'rejected'].includes(a.status)).length;

  if (loading) return <div className="text-zinc-400 py-4">Loading…</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
          <div className="text-2xl font-black text-white">{apps.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Total</div>
        </div>
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <div className="text-2xl font-black text-blue-400">{activeCount}</div>
          <div className="text-[10px] text-blue-400/60 uppercase">Active</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <div className="text-2xl font-black text-emerald-400">{hoursSaved}h</div>
          <div className="text-[10px] text-emerald-400/60 uppercase">Time saved</div>
        </div>
      </div>

      <button
        onClick={() => { setEditing({} as Application); setForm({ status: 'started' }); }}
        className="w-full rounded-xl border-2 border-dashed border-zinc-700 py-3 text-sm text-zinc-400 hover:border-red-500 hover:text-red-400 transition-colors"
      >
        + Track new application
      </button>

      {apps.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-zinc-400 text-sm">No applications tracked yet.</p>
          <p className="text-zinc-500 text-xs mt-1">
            Apply for a service at <Link href="/services" className="text-red-400 underline">Services</Link>, or add one manually above.
          </p>
        </div>
      )}

      {apps.map((app) => {
        const s = STATUS_LABELS[app.status] || { label: app.status, color: 'bg-zinc-600' };
        return (
          <div key={app.id} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-xs font-semibold text-zinc-400">{s.label}</span>
                </div>
                <h3 className="font-bold text-zinc-100 text-sm">{app.service_title}</h3>
                {app.reference_no && <div className="text-xs text-zinc-500 mt-0.5">Ref: {app.reference_no}</div>}
                {app.office_name && <div className="text-xs text-zinc-500">Office: {app.office_name}</div>}
              </div>
              {app.amount_npr && (
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-zinc-200">NPR {app.amount_npr.toLocaleString()}</div>
                  <div className={`text-[10px] ${app.paid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {app.paid ? '✓ Paid' : 'Unpaid'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
              {app.submitted_on && <span>Submitted: {new Date(app.submitted_on).toLocaleDateString()}</span>}
              {app.expected_on && <span>Expected: {new Date(app.expected_on).toLocaleDateString()}</span>}
              {app.completed_on && <span className="text-emerald-400">Done: {new Date(app.completed_on).toLocaleDateString()}</span>}
              {app.reminder_on && <span className="text-amber-400">Reminder: {new Date(app.reminder_on).toLocaleDateString()}</span>}
            </div>

            {app.notes && <div className="mt-2 text-xs text-zinc-500 italic">{app.notes}</div>}

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { setEditing(app); setForm(app); }} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700">Edit</button>
              {(app.reminder_on || app.expected_on) && (
                <button onClick={() => exportCalendar(app)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700">Add to calendar</button>
              )}
              {app.portal_url && (
                <a href={app.portal_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700">Portal</a>
              )}
              <button onClick={() => remove(app.id)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700">Delete</button>
            </div>
          </div>
        );
      })}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 p-5 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-zinc-100 mb-4">{editing.id ? 'Edit Application' : 'Track New Application'}</h3>
            <div className="space-y-3">
              <Fld label="Service title *"><input className="fld" value={form.service_title || ''} onChange={(e) => setForm({ ...form, service_title: e.target.value })} /></Fld>
              <Fld label="Service slug"><input className="fld" value={form.service_slug || ''} onChange={(e) => setForm({ ...form, service_slug: e.target.value })} placeholder="e.g., new-passport" /></Fld>
              <Fld label="Status">
                <select className="fld" value={form.status || 'started'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Fld>
              <Fld label="Reference no."><input className="fld" value={form.reference_no || ''} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></Fld>
              <Fld label="Office name"><input className="fld" value={form.office_name || ''} onChange={(e) => setForm({ ...form, office_name: e.target.value })} /></Fld>
              <Fld label="Portal URL"><input className="fld" value={form.portal_url || ''} onChange={(e) => setForm({ ...form, portal_url: e.target.value })} /></Fld>
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Amount (NPR)"><input type="number" className="fld" value={form.amount_npr || ''} onChange={(e) => setForm({ ...form, amount_npr: Number(e.target.value) || undefined })} /></Fld>
                <Fld label="Paid?"><select className="fld" value={form.paid ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, paid: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></Fld>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Fld label="Submitted on"><input type="date" className="fld" value={form.submitted_on || ''} onChange={(e) => setForm({ ...form, submitted_on: e.target.value })} /></Fld>
                <Fld label="Expected on"><input type="date" className="fld" value={form.expected_on || ''} onChange={(e) => setForm({ ...form, expected_on: e.target.value })} /></Fld>
              </div>
              <Fld label="Reminder date"><input type="date" className="fld" value={form.reminder_on || ''} onChange={(e) => setForm({ ...form, reminder_on: e.target.value })} /></Fld>
              <Fld label="Notes"><textarea className="fld resize-none" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Fld>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { setEditing(null); setForm({}); }} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">Cancel</button>
              <button onClick={save} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500">{editing.id ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .fld { width: 100%; border-radius: 0.5rem; background: rgb(9 9 11); border: 1px solid rgb(63 63 70); padding: 0.5rem 0.75rem; font-size: 0.875rem; color: rgb(244 244 245); outline: none; }
        .fld:focus { border-color: rgb(239 68 68); }
      `}</style>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}
