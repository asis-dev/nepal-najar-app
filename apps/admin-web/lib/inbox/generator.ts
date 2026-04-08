/**
 * Party Action Inbox generator.
 *
 * Reads commitments, complaint clusters, service corrections, and bad wait times,
 * then upserts rows into `party_action_items` (idempotent via unique source_kind+source_ref).
 *
 * Safe to run on every sweep.
 */
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

const kbById = new Map(PROMISES_KNOWLEDGE.map((k) => [k.id, k]));

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

type Item = {
  target_type: 'minister' | 'ministry' | 'party';
  target_slug: string;
  target_name?: string;
  source_kind:
    | 'commitment_stalled'
    | 'commitment_silent'
    | 'commitment_overdue'
    | 'complaint_cluster'
    | 'portal_down'
    | 'wait_time_bad'
    | 'service_correction'
    | 'petition';
  source_ref: string;
  title: string;
  title_ne?: string;
  description?: string;
  link?: string;
  priority: 1 | 2 | 3;
  due_on?: string | null;
};

function targetFromCommitment(id: number) {
  const kb = kbById.get(id);
  if (kb && kb.keyMinistries?.[0]) {
    return {
      target_type: 'ministry' as const,
      target_slug: slugify(kb.keyMinistries[0]),
      target_name: kb.keyMinistries[0],
    };
  }
  return { target_type: 'party' as const, target_slug: 'rsp', target_name: 'RSP Government' };
}

async function pushIfUrgent(newItems: Array<{ id: string; title: string; priority: number; link?: string }>) {
  try {
    const urgent = newItems.filter((i) => i.priority === 1).slice(0, 3);
    if (urgent.length === 0) return;
    const { sendPushToAll } = await import('@/lib/push/send');
    for (const it of urgent) {
      await sendPushToAll({
        title: '🚨 New urgent action item',
        body: it.title.slice(0, 140),
        url: it.link || '/inbox',
      });
    }
  } catch (e) {
    console.error('[inbox/pushIfUrgent]', e);
  }
}

export async function generateInboxItems(): Promise<{ upserted: number; kinds: Record<string, number> }> {
  const supabase = getSupabase();
  const items: Item[] = [];
  const kinds: Record<string, number> = {};

  // 1. Commitments — stalled / silent / overdue
  const { data: promises } = await supabase
    .from('promises')
    .select('id, slug, title, title_ne, status, progress, deadline, last_signal_at');

  const now = Date.now();
  for (const p of promises || []) {
    const id = Number(p.id);
    const tgt = targetFromCommitment(id);
    const link = `/explore/first-100-days/${p.slug}`;

    if (p.status === 'stalled') {
      items.push({
        ...tgt,
        source_kind: 'commitment_stalled',
        source_ref: String(p.id),
        title: `Unstick: ${p.title}`,
        title_ne: p.title_ne ? `अवरोध हटाउनुहोस्: ${p.title_ne}` : undefined,
        description: `This commitment is marked stalled at ${p.progress ?? 0}% progress. Citizens need a status update.`,
        link,
        priority: 1,
      });
    }

    const lastSignal = p.last_signal_at ? new Date(p.last_signal_at).getTime() : 0;
    const silentDays = lastSignal ? (now - lastSignal) / 86400000 : 999;
    if (p.status !== 'completed' && silentDays > 30) {
      items.push({
        ...tgt,
        source_kind: 'commitment_silent',
        source_ref: String(p.id),
        title: `Break silence: ${p.title}`,
        description: `No public signals in ${Math.min(Math.round(silentDays), 999)} days. Post an update.`,
        link,
        priority: 2,
      });
    }

    if (p.deadline && p.status !== 'completed') {
      const due = new Date(p.deadline);
      if (due.getTime() < now) {
        items.push({
          ...tgt,
          source_kind: 'commitment_overdue',
          source_ref: String(p.id),
          title: `Overdue: ${p.title}`,
          description: `Deadline ${p.deadline} passed without delivery.`,
          link,
          priority: 1,
          due_on: p.deadline as string,
        });
      }
    }
  }

  // 2. Complaint clusters (open, medium+ severity)
  try {
    const { data: clusters } = await supabase
      .from('complaint_clusters')
      .select('id, title, title_ne, summary, authority_name, severity, department_key')
      .in('severity', ['high', 'critical', 'medium'])
      .limit(200);

    for (const c of clusters || []) {
      const target_name = (c.authority_name as string) || 'Unassigned authority';
      items.push({
        target_type: 'ministry',
        target_slug: slugify(target_name),
        target_name,
        source_kind: 'complaint_cluster',
        source_ref: String(c.id),
        title: `Resolve complaint cluster: ${c.title}`,
        title_ne: c.title_ne as string | undefined,
        description: (c.summary as string) || undefined,
        link: `/corruption?cluster=${c.id}`,
        priority: c.severity === 'critical' ? 1 : c.severity === 'high' ? 1 : 2,
      });
    }
  } catch {
    /* table may not exist yet */
  }

  // 3. Service corrections (pending)
  try {
    const { data: corrections } = await supabase
      .from('service_corrections')
      .select('id, service_slug, field, message, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    for (const c of corrections || []) {
      items.push({
        target_type: 'party',
        target_slug: 'rsp',
        target_name: 'RSP Government',
        source_kind: 'service_correction',
        source_ref: String(c.id),
        title: `Fix service page: ${c.service_slug} (${c.field})`,
        description: ((c.message as string) || '').slice(0, 280),
        link: `/services`,
        priority: 3,
      });
    }
  } catch {
    /* optional */
  }

  // 4. Bad wait times (median > 120 min)
  try {
    const { data: stats } = await supabase
      .from('service_wait_stats')
      .select('service_slug, office_name, median_minutes, sample_size')
      .gte('median_minutes', 120)
      .gte('sample_size', 3);

    for (const s of stats || []) {
      items.push({
        target_type: 'party',
        target_slug: 'rsp',
        target_name: 'RSP Government',
        source_kind: 'wait_time_bad',
        source_ref: `${s.service_slug}::${s.office_name}`,
        title: `Cut wait times at ${s.office_name}`,
        description: `Citizens report median ${s.median_minutes} min wait for ${s.service_slug} (n=${s.sample_size}).`,
        link: `/services`,
        priority: 2,
      });
    }
  } catch {
    /* optional */
  }

  // Fetch existing source_refs so we know which inserts are NEW (for push alerts)
  const existingKeys = new Set<string>();
  try {
    const { data: existing } = await supabase
      .from('party_action_items')
      .select('source_kind, source_ref');
    for (const e of existing || []) existingKeys.add(`${e.source_kind}::${e.source_ref}`);
  } catch {
    /* noop */
  }

  // Upsert all
  let upserted = 0;
  const chunkSize = 100;
  const now2 = new Date().toISOString();
  const freshlyAdded: Array<{ id: string; title: string; priority: number; link?: string }> = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize).map((it) => ({
      ...it,
      last_seen_at: now2,
    }));
    const { data, error, count } = await supabase
      .from('party_action_items')
      .upsert(chunk, { onConflict: 'source_kind,source_ref', count: 'exact' })
      .select('id, title, priority, link, source_kind, source_ref');
    if (error) {
      console.error('[inbox/generator] upsert error', error);
      continue;
    }
    upserted += count || chunk.length;
    for (const it of chunk) kinds[it.source_kind] = (kinds[it.source_kind] || 0) + 1;
    for (const row of data || []) {
      const key = `${row.source_kind}::${row.source_ref}`;
      if (!existingKeys.has(key) && row.priority === 1) {
        freshlyAdded.push({ id: row.id, title: row.title, priority: row.priority, link: row.link });
      }
    }
  }

  await pushIfUrgent(freshlyAdded);

  return { upserted, kinds };
}
