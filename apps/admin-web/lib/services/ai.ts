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
import { getAllServices, rankServices, searchServices } from './catalog';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEN_MODEL = process.env.SERVICES_AI_MODEL || 'gemini-2.0-flash';
const EMBED_MODEL = 'text-embedding-004';
const AI_ENABLED = process.env.SERVICES_AI_ENABLED !== 'false';
const DAILY_CAP = parseInt(process.env.SERVICES_AI_DAILY_CAP || '1000', 10);
const CACHE_VERSION = 'routing-v2';
const AI_COOLDOWN_MS = Math.max(
  60_000,
  Number.parseInt(process.env.SERVICES_AI_COOLDOWN_MS || '', 10) || 15 * 60 * 1000,
);

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let aiCooldownUntil = 0;

export interface AskResult {
  answer: string;
  cited: Service[];
  cached: boolean;
  model: string | null;
  topService: Service | null;
  topServiceConfidence: number;
  routeMode: 'direct' | 'ambiguous' | 'none';
  routeReason: string | null;
  followUpPrompt: string | null;
}

function normalizeIntentText(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function isAiCoolingDown() {
  return Date.now() < aiCooldownUntil;
}

function beginAiCooldown(reason: string) {
  aiCooldownUntil = Date.now() + AI_COOLDOWN_MS;
  console.warn(`[services/ai] Cooling down provider usage for ${Math.round(AI_COOLDOWN_MS / 1000)}s: ${reason}`);
}

export function buildRoutingQuery(question: string) {
  const normalized = normalizeIntentText(question);
  if (!normalized) return question.trim();

  const signals = new Set<string>();

  if (/(hospital|opd|doctor|clinic|appointment|health|admission|checkup|specialist|अस्पताल|समय|टिकट)/.test(normalized)) {
    signals.add('hospital');
    signals.add('appointment');
  }
  if (/(bir|birendra)/.test(normalized)) signals.add('bir');
  if (/(tuth|teaching|tribhuvan university teaching)/.test(normalized)) signals.add('tuth');
  if (/\bpatan\b/.test(normalized)) signals.add('patan');
  if (/\bcivil\b/.test(normalized)) signals.add('civil');
  if (/\bkanti\b/.test(normalized)) signals.add('kanti');
  if (/(maternity|prasuti)/.test(normalized)) signals.add('maternity');
  if (/(oncology|b p koirala|bp koirala)/.test(normalized)) signals.add('oncology');

  if (/(license|licence|driving|renewal|renew|dotm|trial|smart license)/.test(normalized)) {
    signals.add('driving');
    signals.add('license');
  }
  if (/(renewal|renew|expire|expired)/.test(normalized)) signals.add('renewal');
  if (/trial/.test(normalized)) signals.add('trial');
  if (/(new license|fresh license|new driving)/.test(normalized)) signals.add('new');

  if (/(nea|electricity|power)/.test(normalized)) {
    signals.add('nea');
    signals.add('electricity');
    signals.add('bill');
  }
  if (/(kukl|water|khanepani)/.test(normalized)) {
    signals.add('kukl');
    signals.add('water');
    signals.add('bill');
  }
  if (/(passport|e passport|epassport|rahadani)/.test(normalized)) {
    signals.add('passport');
  }
  if (/(citizenship|nagarikta)/.test(normalized)) {
    signals.add('citizenship');
  }
  if (/(pan|tax)/.test(normalized)) {
    signals.add('pan');
    signals.add('tax');
  }

  if (signals.size === 0) {
    return question.trim();
  }

  return [...signals].join(' ');
}

export function shouldAutoRoute(question: string, ranked: Array<{ service: Service; score: number }>) {
  const topRanked = ranked[0];
  const secondRanked = ranked[1];
  const topScore = topRanked?.score ?? 0;
  const secondScore = secondRanked?.score ?? 0;

  if (!topRanked || topScore < 65) return false;

  const normalized = normalizeIntentText(question);
  const broadHospitalIntent =
    /(hospital|opd|doctor|clinic|appointment|health|admission|checkup|specialist|अस्पताल|समय|टिकट)/.test(normalized) &&
    !/(bir|teaching|tuth|patan|civil|kanti|maternity|bharatpur|oncology)/.test(normalized);

  const broadBillIntent =
    /(bill|payment|pay)/.test(normalized) &&
    !/(nea|electricity|kukl|water)/.test(normalized);

  const explicitUtilityProvider = /(nea|electricity|kukl|water)/.test(normalized);

  if (broadHospitalIntent) {
    if (
      topRanked.service.providerType === 'hospital' &&
      secondRanked?.service.providerType === 'hospital' &&
      secondScore >= topScore * 0.7
    ) {
      return false;
    }
  }

  if (broadBillIntent) {
    if (
      topRanked.service.category === 'utilities' &&
      secondRanked?.service.category === 'utilities' &&
      secondScore >= topScore * 0.75
    ) {
      return false;
    }
  }

  if (explicitUtilityProvider) {
    if (
      /(nea|electricity)/.test(normalized) &&
      /nea|electricity/.test(normalizeIntentText(`${topRanked.service.slug} ${topRanked.service.providerName} ${topRanked.service.title.en}`))
    ) {
      return topScore >= 90;
    }

    if (
      /(kukl|water)/.test(normalized) &&
      /kukl|water/.test(normalizeIntentText(`${topRanked.service.slug} ${topRanked.service.providerName} ${topRanked.service.title.en}`))
    ) {
      return topScore >= 90;
    }
  }

  return secondScore === 0 || (topScore - secondScore >= 18 && topScore >= secondScore * 1.15);
}

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────
function hashQuestion(q: string, locale: string) {
  return crypto
    .createHash('sha256')
    .update(`${CACHE_VERSION}::${locale}::${q.trim().toLowerCase().replace(/\s+/g, ' ')}`)
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

  const topService = cited[0] || null;
  return {
    answer: data.answer,
    cited,
    cached: true,
    model: data.model,
    topService,
    topServiceConfidence: topService ? 0.5 : 0,
    routeMode: topService ? 'direct' : cited.length > 0 ? 'ambiguous' : 'none',
    routeReason: topService ? 'Cached confident route.' : null,
    followUpPrompt: null,
  };
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
  if (GEMINI_API_KEY && AI_ENABLED && !isAiCoolingDown()) {
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

  return [];
}

// ─────────────────────────────────────────────────────────────
// Gemini embed + generate
// ─────────────────────────────────────────────────────────────
export async function embed(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY || isAiCoolingDown()) return null;
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
    if (!r.ok) {
      if (r.status === 429) beginAiCooldown('embedding quota exhausted');
      return null;
    }
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
  if (!GEMINI_API_KEY || !AI_ENABLED || isAiCoolingDown()) return null;
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
      const body = await r.text();
      if (r.status === 429) {
        beginAiCooldown('generation quota exhausted');
      } else {
        console.warn('[services/ai] Gemini error:', r.status, body);
      }
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
  if (!trimmed) {
    return {
      answer: '',
      cited: [],
      cached: false,
      model: null,
      topService: null,
      topServiceConfidence: 0,
      routeMode: 'none',
      routeReason: null,
      followUpPrompt: null,
    };
  }

  const routingQuestion = buildRoutingQuery(trimmed);

  // 1. cache
  const cached = await getCachedAnswer(trimmed, locale);
  if (cached) return cached;

  const ranked = await rankServices(routingQuestion, locale);
  const topRanked = ranked[0];
  const topScore = topRanked?.score ?? 0;
  const confidentTopService = shouldAutoRoute(routingQuestion, ranked) && topRanked
    ? topRanked.service
    : null;
  const routeMode: AskResult['routeMode'] =
    confidentTopService ? 'direct' : ranked.length > 0 ? 'ambiguous' : 'none';
  const routeReason = buildRouteReason(trimmed, routingQuestion, ranked, confidentTopService, locale);
  const followUpPrompt = routeMode === 'ambiguous'
    ? buildFollowUpPrompt(trimmed, ranked, locale)
    : null;

  // 2. retrieve
  const cited = ranked.length > 0
    ? ranked.slice(0, 5).map((entry) => entry.service)
    : await retrieveServices(routingQuestion, locale, 5);

  // 3. daily cap check
  const under = await checkDailyCap();
  if (!under || !GEMINI_API_KEY || !AI_ENABLED || isAiCoolingDown()) {
    // Static fallback: return top matches as a structured answer.
    const answer = buildStaticAnswer(trimmed, cited, locale);
    return {
      answer,
      cited,
      cached: false,
      model: null,
      topService: confidentTopService,
      topServiceConfidence: topScore,
      routeMode,
      routeReason,
      followUpPrompt,
    };
  }

  // 4. generate
  const gen = await generateAnswer(trimmed, cited, locale);
  if (!gen) {
    const answer = buildStaticAnswer(trimmed, cited, locale);
    return {
      answer,
      cited,
      cached: false,
      model: null,
      topService: confidentTopService,
      topServiceConfidence: topScore,
      routeMode,
      routeReason,
      followUpPrompt,
    };
  }

  // 5. persist
  await saveAnswer(trimmed, locale, gen.text, cited, gen.model);
  return {
    answer: gen.text,
    cited,
    cached: false,
    model: gen.model,
    topService: confidentTopService,
    topServiceConfidence: topScore,
    routeMode,
    routeReason,
    followUpPrompt,
  };
}

function buildRouteReason(
  originalQuestion: string,
  routingQuestion: string,
  ranked: Array<{ service: Service; score: number }>,
  topService: Service | null,
  locale: 'en' | 'ne',
) {
  if (topService) {
    return locale === 'ne'
      ? `${topService.title.ne} स्पष्ट रूपमा सबैभन्दा नजिकको सेवा देखियो।`
      : `${topService.title.en} is the clearest match for this request.`;
  }

  if (ranked.length >= 2) {
    const [first, second] = ranked;
    const isHospitalPair =
      first.service.providerType === 'hospital' && second.service.providerType === 'hospital';
    const isUtilityPair =
      first.service.category === 'utilities' && second.service.category === 'utilities';

    if (isHospitalPair) {
      return locale === 'ne'
        ? 'यो अनुरोध अस्पतालतर्फ मिल्छ, तर कुन अस्पताल चाहिएको हो भन्ने अझै स्पष्ट छैन।'
        : 'This clearly looks like a hospital request, but the exact hospital is still ambiguous.';
    }

    if (isUtilityPair) {
      return locale === 'ne'
        ? 'यो बिल/भुक्तानी अनुरोध हो, तर कुन सेवा प्रदायक हो भन्ने अझै स्पष्ट छैन।'
        : 'This is a utility payment request, but the provider is still ambiguous.';
    }
  }

  if (!topService && ranked.length > 0 && routingQuestion !== normalizeIntentText(originalQuestion)) {
    return locale === 'ne'
      ? 'आवश्यक संकेत भेटियो, तर सुरक्षित रूपमा एउटा मात्र सेवा छान्न पर्याप्त थिएन।'
      : 'The assistant found useful intent signals, but not enough to safely choose a single service.';
  }

  return ranked.length === 0
    ? locale === 'ne'
      ? 'यो अनुरोधलाई उपलब्ध सेवा सूचीसँग आत्मविश्वासका साथ मिलाउन सकिएन।'
      : 'The assistant could not confidently match this request to the current service catalog.'
    : null;
}

function buildFollowUpPrompt(
  question: string,
  ranked: Array<{ service: Service; score: number }>,
  locale: 'en' | 'ne',
) {
  if (ranked.length === 0) return null;
  const normalized = normalizeIntentText(question);

  if (/(hospital|opd|doctor|clinic|appointment|health|admission|checkup|specialist|अस्पताल|समय|टिकट)/.test(normalized)) {
    return locale === 'ne'
      ? 'कुन अस्पताल चाहिएको हो? जस्तै: Bir, TUTH, Patan, Civil.'
      : 'Which hospital do you mean? For example: Bir, TUTH, Patan, or Civil.';
  }

  if (/(bill|payment|pay)/.test(normalized) && !/(nea|electricity|kukl|water)/.test(normalized)) {
    return locale === 'ne'
      ? 'कुन बिल तिर्नु छ? NEA कि KUKL?'
      : 'Which bill do you want to pay: NEA electricity or KUKL water?';
  }

  if (/(license|licence|driving)/.test(normalized) && !/(renew|renewal|trial|new)/.test(normalized)) {
    return locale === 'ne'
      ? 'लाइसेन्समा के गर्नुपर्छ? नयाँ, नवीकरण, कि ट्रायल?'
      : 'What do you need for the license: new application, renewal, or trial?';
  }

  if (/(citizenship|nagarikta)/.test(normalized) && !/(birth|descent|duplicate|minor)/.test(normalized)) {
    return locale === 'ne'
      ? 'कुन प्रकारको नागरिकता चाहिएको हो? वंशज, जन्मसिद्ध, कि प्रतिलिपि?'
      : 'Which citizenship service do you need: by descent, by birth, or duplicate?';
  }

  return null;
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
