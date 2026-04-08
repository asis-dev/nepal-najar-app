/**
 * Nepal Republic — Services AI layer.
 *
 * Uses Gemini 2.0 Flash (free tier: 1,500 req/day, 1M tokens/min) for Q&A.
 * Embeddings via Gemini text-embedding-004 (free tier).
 * Falls back to keyword search if no API key or if Gemini is unavailable.
 *
 * Hard spend cap is enforced via `SERVICES_AI_DAILY_CAP` env var (default 1000).
 * Kill switch: set `SERVICES_AI_ENABLED=false` to disable AI entirely.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Service } from './types';
import { getAllServices, searchServices } from './catalog';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEN_MODEL = process.env.SERVICES_AI_MODEL || 'gemini-2.0-flash';
const EMBED_MODEL = 'text-embedding-004';
const AI_ENABLED = process.env.SERVICES_AI_ENABLED !== 'false';
const DAILY_CAP = parseInt(process.env.SERVICES_AI_DAILY_CAP || '1000', 10);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface AskResult {
  answer: string;
  cited: Service[];
  cached: boolean;
  model: string | null;
  topService: Service | null;
}

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────
function hashQuestion(q: string, locale: string) {
  return crypto
    .createHash('sha256')
    .update(`${locale}::${q.trim().toLowerCase().replace(/\s+/g, ' ')}`)
    .digest('hex');
}

function supa() {
  if (!SUPA_URL || !SUPA_KEY) return null;
  return createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
}

export async function getCachedAnswer(question: string, locale: 'en' | 'ne'): Promise<AskResult | null> {
  const c = supa();
  if (!c) return null;
  const h = hashQuestion(question, locale);
  const { data } = await c
    .from('service_chat_cache')
    .select('answer, cited_service_ids, model')
    .eq('question_hash', h)
    .eq('locale', locale)
    .maybeSingle();
  if (!data) return null;

  // bump hit counter fire-and-forget
  c.from('service_chat_cache')
    .update({ hits: undefined, last_hit_at: new Date().toISOString() })
    .eq('question_hash', h)
    .eq('locale', locale)
    .then(() => {});

  const all = await getAllServices();
  const cited = (data.cited_service_ids || [])
    .map((id: string) => all.find((s) => s.id === id))
    .filter(Boolean) as Service[];

  return { answer: data.answer, cited, cached: true, model: data.model, topService: cited[0] || null };
}

export async function saveAnswer(
  question: string,
  locale: 'en' | 'ne',
  answer: string,
  cited: Service[],
  model: string,
) {
  const c = supa();
  if (!c) return;
  const h = hashQuestion(question, locale);
  await c
    .from('service_chat_cache')
    .upsert(
      {
        question_hash: h,
        locale,
        question,
        answer,
        cited_service_ids: cited.map((s) => s.id).filter(Boolean),
        model,
      },
      { onConflict: 'question_hash,locale' },
    );
}

// ─────────────────────────────────────────────────────────────
// Daily cap
// ─────────────────────────────────────────────────────────────
export async function checkDailyCap(): Promise<boolean> {
  const c = supa();
  if (!c) return true; // no DB, no cap
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await c
    .from('service_chat_cache')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since.toISOString());
  return (count ?? 0) < DAILY_CAP;
}

// ─────────────────────────────────────────────────────────────
// Retrieval — pgvector if we have embeddings, else keyword
// ─────────────────────────────────────────────────────────────
export async function retrieveServices(question: string, locale: 'en' | 'ne', topK = 5): Promise<Service[]> {
  // Tier 1: pgvector semantic search (best quality, requires embeddings seeded)
  if (GEMINI_API_KEY && AI_ENABLED) {
    try {
      const qEmbed = await embed(question);
      if (qEmbed) {
        const c = supa();
        if (c) {
          const { data } = await c.rpc('match_services', {
            query_embedding: qEmbed,
            match_count: topK,
          });
          if (data && data.length > 0) {
            const all = await getAllServices();
            return data.map((d: any) => all.find((s) => s.id === d.id)).filter(Boolean) as Service[];
          }
        }
      }
    } catch (err) {
      console.warn('[services/ai] vector search failed, falling back:', err);
    }
  }

  // Tier 2: keyword fallback — always works
  const hits = await searchServices(question, locale);
  if (hits.length > 0) return hits.slice(0, topK);

  // Tier 3: top popular
  const all = await getAllServices();
  return all.slice(0, topK);
}

// ─────────────────────────────────────────────────────────────
// Gemini embed + generate
// ─────────────────────────────────────────────────────────────
export async function embed(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_QUERY',
        }),
      },
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.embedding?.values || null;
  } catch {
    return null;
  }
}

function buildPrompt(question: string, services: Service[], locale: 'en' | 'ne'): string {
  const context = services
    .map((s, i) => {
      const docs = s.documents.map((d) => `- ${d.title.en} / ${d.title.ne}${d.required ? ' (required)' : ''}`).join('\n');
      const steps = s.steps.map((st) => `${st.order}. ${st.title.en} — ${st.detail.en}`).join('\n');
      const offices = s.offices
        .map((o) => `${o.name.en} — ${o.address.en}${o.phone ? ' · ' + o.phone : ''}`)
        .join('\n');
      return `
[SERVICE ${i + 1}]
Title: ${s.title.en} / ${s.title.ne}
Provider: ${s.providerName}
Summary: ${s.summary.en}
Time: ${s.estimatedTime?.en || 'unknown'}
Fee: ${s.feeRange?.en || 'unknown'}
Documents:
${docs || '(none listed)'}
Steps:
${steps || '(none listed)'}
Offices:
${offices || '(none listed)'}
Official URL: ${s.officialUrl || 'n/a'}
`;
    })
    .join('\n---\n');

  const instructions = locale === 'ne'
    ? `तिमी Nepal Republic को सेवा सहायक हौ। प्रयोगकर्तालाई नेपाल सरकार र अत्यावश्यक सेवाहरूबारे व्यावहारिक जवाफ देऊ।

नियमहरू:
1. तल दिइएको SERVICE CONTEXT मा भएको जानकारी मात्र प्रयोग गर।
2. यदि उत्तर context मा छैन भने — "माफ गर्नुहोस्, मसँग यो जानकारी छैन। कार्यालयमा फोन गर्नुहोस् वा आधिकारिक वेबसाइट हेर्नुहोस्।" भन।
3. कहिल्यै कुरा नबनाऊ। शुल्क, समय, कागजात बारे अनुमान नगर।
4. नेपालीमा छोटो र स्पष्ट जवाफ देऊ। bullet points प्रयोग गर।
5. सम्भव भए फोन नम्बर र कार्यालय सुझाऊ।`
    : `You are the Nepal Republic services assistant. Give Nepalis practical, concrete answers about government and essential services.

Rules:
1. Use ONLY the SERVICE CONTEXT below. Do not use outside knowledge.
2. If the answer isn't in the context, say: "Sorry, I don't have that info — please call the office or check the official site." Do not guess.
3. Never invent fees, timelines, or documents.
4. Be concise. Use bullets. Short paragraphs.
5. When possible, include the office phone number and location from the context.`;

  return `${instructions}

=== SERVICE CONTEXT ===
${context}
=== END CONTEXT ===

User question (${locale}): ${question}

Answer:`;
}

export async function generateAnswer(
  question: string,
  services: Service[],
  locale: 'en' | 'ne',
): Promise<{ text: string; model: string } | null> {
  if (!GEMINI_API_KEY || !AI_ENABLED) return null;
  const prompt = buildPrompt(question, services, locale);

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 700,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          ],
        }),
      },
    );
    if (!r.ok) {
      console.warn('[services/ai] Gemini error:', r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    if (!text.trim()) return null;
    return { text: text.trim(), model: GEN_MODEL };
  } catch (err) {
    console.warn('[services/ai] generate failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Top-level ask
// ─────────────────────────────────────────────────────────────
export async function ask(question: string, locale: 'en' | 'ne' = 'en'): Promise<AskResult> {
  const trimmed = question.trim();
  if (!trimmed) return { answer: '', cited: [], cached: false, model: null, topService: null };

  // 1. cache
  const cached = await getCachedAnswer(trimmed, locale);
  if (cached) return cached;

  // 2. retrieve
  const cited = await retrieveServices(trimmed, locale, 5);

  // 3. daily cap check
  const under = await checkDailyCap();
  if (!under || !GEMINI_API_KEY || !AI_ENABLED) {
    // Static fallback: return top matches as a structured answer.
    const answer = buildStaticAnswer(trimmed, cited, locale);
    return { answer, cited, cached: false, model: null, topService: cited[0] || null };
  }

  // 4. generate
  const gen = await generateAnswer(trimmed, cited, locale);
  if (!gen) {
    const answer = buildStaticAnswer(trimmed, cited, locale);
    return { answer, cited, cached: false, model: null, topService: cited[0] || null };
  }

  // 5. persist
  await saveAnswer(trimmed, locale, gen.text, cited, gen.model);
  return { answer: gen.text, cited, cached: false, model: gen.model, topService: cited[0] || null };
}

function buildStaticAnswer(_q: string, services: Service[], locale: 'en' | 'ne'): string {
  if (services.length === 0) {
    return locale === 'ne'
      ? 'माफ गर्नुहोस्, मैले सम्बन्धित सेवा भेट्टाउन सकिनँ। कृपया अर्को शब्द प्रयोग गरेर खोज्नुहोस्।'
      : "Sorry, I couldn't find a matching service. Try different keywords.";
  }
  const lines = services.slice(0, 3).map((s) => {
    const title = locale === 'ne' ? s.title.ne : s.title.en;
    const summary = locale === 'ne' ? s.summary.ne : s.summary.en;
    return `• ${title} — ${summary}`;
  });
  const prefix = locale === 'ne' ? 'यी सेवाहरू हेर्नुहोस्:' : 'Here are relevant services:';
  return `${prefix}\n\n${lines.join('\n')}`;
}
