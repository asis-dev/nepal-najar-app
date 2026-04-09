'use client';
import { useEffect, useState } from 'react';

type App = {
  id: string;
  service_slug: string;
  service_title: string;
  service_category?: string | null;
  reference_no?: string | null;
  office_name?: string | null;
  portal_url?: string | null;
  amount_npr?: number | null;
  paid?: boolean | null;
  paid_on?: string | null;
  submitted_on?: string | null;
  expected_on?: string | null;
  completed_on?: string | null;
  status: string;
  last_status_note?: string | null;
  reminder_on?: string | null;
  notes?: string | null;
  updated_at: string;
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  started: { label: 'Started', tone: 'bg-zinc-800 text-zinc-300' },
  in_progress: { label: 'In progress', tone: 'bg-sky-500/20 text-sky-300' },
  submitted: { label: 'Submitted', tone: 'bg-amber-500/20 text-amber-300' },
  pending_payment: { label: 'Pending payment', tone: 'bg-amber-500/20 text-amber-300' },
  pending_visit: { label: 'Pending visit', tone: 'bg-amber-500/20 text-amber-300' },
  ready_pickup: { label: 'Ready for pickup', tone: 'bg-emerald-500/20 text-emerald-300' },
  completed: { label: 'Completed', tone: 'bg-emerald-500/30 text-emerald-200' },
  rejected: { label: 'Rejected', tone: 'bg-red-500/20 text-red-300' },
  cancelled: { label: 'Cancelled', tone: 'bg-zinc-800 text-zinc-500' },
};

export function ApplicationsDashboard() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<App | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/me/applications');
      const j = await r.json();
      setApps(j.applications || []);
    } finally { setLoading(false); }
  }

  async function save(a: App) {
    const res = await fetch('/api/me/applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(a),
    });
    if (res.ok) { setEditing(null); await load(); }
    else alert('Save failed');
  }

  async function remove(id: string) {
    if (!confirm('Delete this application?')) return;
    await fetch(`/api/me/applications?id=${id}`, { method: 'DELETE' });
    await load();
  }

  if (loading) return <div className="text-zinc-400">Loading…</div>;

  const field = 'w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-100';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-zinc-500">{apps.length} tracked</div>
        <button
          onClick={() => setEditing({
            id: '' as any, service_slug: '', service_title: '', status: 'started', updated_at: '',
          })}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
        >
          + Track new
        </button>
      </div>

      {apps.length === 0 && !editing && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center text-zinc-400">
          No applications yet. Tap "Track new" to add one.
        </div>
      )}

      {editing && (
        <form
          onSubmit={(e) => { e.preventDefault(); save(editing); }}
          className="rounded-2xl bg-zinc-900 border border-red-500/30 p-5 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Service slug (e.g. new-passport)" className={field}
              value={editing.service_slug} onChange={(e) => setEditing({ ...editing, service_slug: e.target.value })} />
            <input required placeholder="Service title" className={field}
              value={editing.service_title} onChange={(e) => setEditing({ ...editing, service_title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Reference no." className={field}
              value={editing.reference_no || ''} onChange={(e) => setEditing({ ...editing, reference_no: e.target.value })} />
            <input placeholder="Office" className={field}
              value={editing.office_name || ''} onChange={(e) => setEditing({ ...editing, office_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select className={field} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              {Object.keys(STATUS_LABELS).map((k) => <option key={k} value={k}>{STATUS_LABELS[k].label}</option>)}
            </select>
            <input type="date" className={field} value={editing.expected_on || ''} onChange={(e) => setEditing({ ...editing, expected_on: e.target.value })} />
            <input type="date" className={field} placeholder="Reminder" value={editing.reminder_on || ''} onChange={(e) => setEditing({ ...editing, reminder_on: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Amount NPR" className={field}
              value={editing.amount_npr || ''} onChange={(e) => setEditing({ ...editing, amount_npr: e.target.value === '' ? null : Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={!!editing.paid} onChange={(e) => setEditing({ ...editing, paid: e.target.checked })} /> Paid
            </label>
          </div>
          <textarea placeholder="Notes / status update" rows={2} className={field}
            value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-zinc-800 px-4 text-sm text-zinc-300">Cancel</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {apps.map((a) => {
          const st = STATUS_LABELS[a.status] || STATUS_LABELS.started;
          return (
            <li key={a.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${st.tone}`}>{st.label}</span>
                    {a.paid && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">PAID</span>}
                  </div>
                  <div className="font-bold text-zinc-100">{a.service_title}</div>
                  {a.reference_no && <div className="text-xs text-zinc-500 font-mono mt-1">Ref: {a.reference_no}</div>}
                  {a.office_name && <div className="text-xs text-zinc-500">Office: {a.office_name}</div>}
                  {a.expected_on && <div className="text-xs text-amber-400 mt-1">Expected: {a.expected_on}</div>}
                  {a.reminder_on && <div className="text-xs text-sky-400">Reminder: {a.reminder_on}</div>}
                  {a.notes && <div className="text-xs text-zinc-400 mt-2 line-clamp-2">{a.notes}</div>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditing(a)} className="text-xs text-zinc-400 hover:text-zinc-100">Edit</button>
                  <button onClick={() => remove(a.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
