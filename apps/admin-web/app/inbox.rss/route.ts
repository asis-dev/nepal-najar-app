import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 300;

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  let items: any[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('party_action_items')
        .select('id, title, description, source_kind, target_name, priority, first_seen_at, link, upvotes')
        .is('resolved_at', null)
        .order('first_seen_at', { ascending: false })
        .limit(50);
      items = data || [];
    } catch {
      /* noop */
    }
  }

  const base = 'https://nepalrepublic.org';
  const now = new Date().toUTCString();
  const rssItems = items
    .map((it) => {
      const link = `${base}${it.link || '/inbox'}`;
      const pub = it.first_seen_at ? new Date(it.first_seen_at).toUTCString() : now;
      const cat = it.source_kind || 'action';
      const desc = `${it.target_name ? `Target: ${it.target_name}\n\n` : ''}${it.description || ''}\n\n▲ ${it.upvotes || 0} upvotes`;
      return `<item>
  <title>${esc(it.title)}</title>
  <link>${esc(link)}</link>
  <guid isPermaLink="false">nr-inbox-${it.id}</guid>
  <category>${esc(cat)}</category>
  <pubDate>${pub}</pubDate>
  <description>${esc(desc)}</description>
</item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Nepal Republic — Party Action Inbox</title>
  <link>${base}/inbox</link>
  <description>Auto-generated public todo list for the government of Nepal.</description>
  <language>en-np</language>
  <lastBuildDate>${now}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
