import Link from 'next/link';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { UpvoteButton } from '@/components/public/inbox/upvote-button';
import { DigestSubscribe } from '@/components/public/digest-subscribe';
import { PushOptIn } from '@/components/public/push-opt-in';

export const revalidate = 60;
export const metadata = {
  title: 'Party Action Inbox — Nepal Republic',
  description: 'Auto-generated public todo list for the government. Upvote what matters to you.',
};

const KIND_LABELS: Record<string, { label: string; tone: string }> = {
  commitment_stalled: { label: 'Stalled', tone: 'bg-red-500/10 text-red-400 border-red-500/30' },
  commitment_silent: { label: 'Silent', tone: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  commitment_overdue: { label: 'Overdue', tone: 'bg-red-500/10 text-red-400 border-red-500/30' },
  complaint_cluster: { label: 'Complaints', tone: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  portal_down: { label: 'Portal down', tone: 'bg-red-500/10 text-red-400 border-red-500/30' },
  wait_time_bad: { label: 'Long waits', tone: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  service_correction: { label: 'Service fix', tone: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  petition: { label: 'Petition', tone: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
};

async function getItems() {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('party_action_items')
      .select('*')
      .is('resolved_at', null)
      .order('priority', { ascending: true })
      .order('upvotes', { ascending: false })
      .limit(200);
    return data || [];
  } catch {
    return [];
  }
}

export default async function InboxPage() {
  const items = await getItems();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-3">
          PUBLIC PRESSURE TOOL · जनदबाब
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Party Action Inbox</h1>
        <div className="flex items-center justify-center mb-2"><PushOptIn /></div>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Auto-generated todo list for the government — built from stalled commitments, citizen complaints, and broken services. Upvote what matters.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-10 text-center text-zinc-400">
          No open action items yet. Run the generator at{' '}
          <code className="text-zinc-300">/api/inbox/generate</code>.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it: any) => {
            const tone = KIND_LABELS[it.source_kind] || { label: it.source_kind, tone: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
            const isUrgent = it.priority === 1;
            return (
              <li
                key={it.id}
                className={`rounded-xl bg-zinc-900 border p-4 ${
                  isUrgent ? 'border-red-500/30' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <UpvoteButton id={it.id} initial={it.upvotes || 0} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${tone.tone}`}>
                        {tone.label}
                      </span>
                      {isUrgent && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                          Urgent
                        </span>
                      )}
                      {it.target_name && (
                        <span className="text-[11px] text-zinc-500">→ {it.target_name}</span>
                      )}
                    </div>
                    <div className="font-semibold text-zinc-100 leading-snug">{it.title}</div>
                    {it.description && (
                      <div className="text-sm text-zinc-400 mt-1 line-clamp-2">{it.description}</div>
                    )}
                    {it.link && (
                      <Link
                        href={it.link}
                        className="text-xs text-red-400 hover:underline inline-block mt-2"
                      >
                        Read more →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 max-w-xl mx-auto">
        <DigestSubscribe />
      </div>

      <div className="mt-10 text-center text-xs text-zinc-500">
        Items auto-refresh when the intelligence sweep runs. Resolved items disappear automatically.
      </div>
    </div>
  );
}
