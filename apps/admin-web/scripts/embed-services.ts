/**
 * Generate Gemini embeddings for every seeded service.
 * Run from apps/admin-web:
 *   npx tsx scripts/embed-services.ts
 * Requires:
 *   GOOGLE_AI_API_KEY (or GEMINI_API_KEY)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!GEMINI_API_KEY) {
  console.error('Missing GOOGLE_AI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function embed(text: string): Promise<number[]> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    },
  );
  if (!r.ok) throw new Error(`Gemini embed failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.embedding.values;
}

function buildDocText(s: any): string {
  const tags = Array.isArray(s.tags) ? s.tags.join(' ') : '';
  const docs = (s.documents || []).map((d: any) => `${d.title?.en || ''} ${d.title?.ne || ''}`).join(' ');
  const faqs = (s.faqs || []).map((f: any) => `${f.q?.en || ''} ${f.a?.en || ''}`).join(' ');
  return [
    s.title_en, s.title_ne,
    s.summary_en, s.summary_ne,
    s.provider_name,
    tags, docs, faqs,
  ].filter(Boolean).join('\n');
}

async function main() {
  const { data, error } = await supabase.from('services').select('*').eq('is_active', true);
  if (error) throw error;
  if (!data) return;

  console.log(`Embedding ${data.length} services…`);
  let ok = 0, fail = 0;

  for (const s of data) {
    try {
      const text = buildDocText(s);
      const vec = await embed(text);
      const { error: upErr } = await supabase.from('services').update({ embedding: vec as any }).eq('id', s.id);
      if (upErr) throw upErr;
      console.log(`  ✓ ${s.slug}`);
      ok++;
    } catch (e: any) {
      console.error(`  ✗ ${s.slug}: ${e.message}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 200)); // avoid rate limit
  }

  console.log(`\nDone. ${ok} embedded, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
