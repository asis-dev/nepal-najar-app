/**
 * Commitment Briefing Generator
 *
 * Generates AI-powered structured briefings for individual government commitments
 * by synthesizing intelligence signals matched to each commitment.
 *
 * Includes caching (6-hour TTL), Nepali translation, and batch generation.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CommitmentBriefing {
  commitmentId: number;
  title: string;
  shortSummary: string;
  fullBriefing: {
    whatsHappening: string;
    whosSayingWhat: {
      source: string;
      person?: string;
      quote: string;
      date: string;
      sentiment: 'positive' | 'negative' | 'neutral';
    }[];
    keyNumbers: {
      icon: string;
      label: string;
      value: string;
    }[];
    whatToWatch: string;
  };
  fullBriefingNe?: {
    whatsHappening: string;
    whosSayingWhat: {
      source: string;
      person?: string;
      quote: string;
      date: string;
      sentiment: 'positive' | 'negative' | 'neutral';
    }[];
    keyNumbers: {
      icon: string;
      label: string;
      value: string;
    }[];
    whatToWatch: string;
  };
  generatedAt: string;
  signalCount: number;
  sourceCount: number;
}

interface RawSignal {
  id: string;
  title: string;
  content: string | null;
  content_summary: string | null;
  source_id: string;
  url: string;
  discovered_at: string;
  classification: string | null;
  extracted_data: Record<string, unknown> | null;
}

interface RawCommitment {
  id: number;
  title: string;
  title_ne: string | null;
  description: string | null;
  description_ne: string | null;
  category: string | null;
  status: string | null;
  progress: number | null;
  summary: string | null;
  summary_ne: string | null;
}

interface AIBriefingResponse {
  whatsHappening: string;
  whosSayingWhat: {
    source: string;
    person?: string;
    quote: string;
    date: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  keyNumbers: {
    icon: string;
    label: string;
    value: string;
  }[];
  whatToWatch: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJSON<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ── Core: fetch signals for a commitment ─────────────────────────────────────

async function fetchCommitmentSignals(commitmentId: number): Promise<RawSignal[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, content, content_summary, source_id, url, discovered_at, classification, extracted_data',
    )
    .contains('matched_promise_ids', [commitmentId])
    .order('discovered_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[CommitmentBriefing] Failed to fetch signals:', error.message);
    return [];
  }

  return (data || []) as unknown as RawSignal[];
}

async function fetchCommitment(commitmentId: number): Promise<RawCommitment | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('promises')
    .select('id, title, title_ne, description, description_ne, category, status, progress, summary, summary_ne')
    .eq('id', commitmentId)
    .single();

  if (error || !data) return null;
  return data as unknown as RawCommitment;
}

// ── Core: generate AI briefing ───────────────────────────────────────────────

async function generateAIBriefing(
  commitment: RawCommitment,
  signals: RawSignal[],
): Promise<AIBriefingResponse | null> {
  const signalContext = signals
    .map((s, i) => {
      const content = s.content_summary || (s.content || '').slice(0, 500);
      const entities = s.extracted_data
        ? Object.entries(s.extracted_data)
            .filter(([, v]) => Array.isArray(v) && (v as unknown[]).length > 0)
            .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
            .join('; ')
        : '';
      return (
        `${i + 1}. Source: ${s.source_id}, Date: ${s.discovered_at}\n` +
        `   Content: ${content}\n` +
        `   Classification: ${s.classification || 'unknown'}` +
        (entities ? `\n   Entities: ${entities}` : '')
      );
    })
    .join('\n\n');

  const systemPrompt = `You are a political analyst writing a briefing about a Nepal government commitment.

COMMITMENT: ${commitment.title}
DESCRIPTION: ${commitment.description || 'No description available'}
CURRENT STATUS: ${commitment.status || 'unknown'} at ${commitment.progress ?? 0}%

HERE ARE ${signals.length} NEWS SIGNALS ABOUT THIS COMMITMENT (most recent first):
${signalContext}

Generate a structured briefing in JSON format:
{
  "whatsHappening": "3-5 sentence factual overview synthesizing all sources. State what is confirmed, what is claimed, and what is disputed.",
  "whosSayingWhat": [
    {"source": "source name", "person": "official name if mentioned", "quote": "key claim or statement attributed to them", "date": "when", "sentiment": "positive/negative/neutral"}
  ],
  "keyNumbers": [
    {"icon": "emoji icon (use one of: \u{1F4B0} \u{1F4CA} \u{1F4C5} \u26A0\uFE0F \u{1F3D7}\uFE0F \u{1F4CD} \u{1F4C8} \u{1F465})", "label": "what this number represents", "value": "the number"}
  ],
  "whatToWatch": "2-3 sentences about unresolved contradictions, upcoming deadlines, risks, or things citizens should monitor"
}

RULES:
- Attribute every claim to a specific source
- If sources contradict each other, note the contradiction explicitly
- Extract ALL numbers mentioned (money, percentages, dates, counts)
- Be factual and neutral — don't editorialize
- "What to watch" should highlight genuine concerns, not speculation
- If there are fewer than 3 signals, keep it brief
- Return ONLY valid JSON, no markdown`;

  const userPrompt = `Generate the structured briefing based on the signals above.`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    return parseJSON<AIBriefingResponse>(response.content);
  } catch (err) {
    console.error(
      '[CommitmentBriefing] AI briefing generation failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Core: translate to Nepali ────────────────────────────────────────────────

async function translateBriefingToNepali(
  briefing: AIBriefingResponse,
): Promise<AIBriefingResponse | null> {
  const systemPrompt = `You are a professional translator. Translate this political briefing JSON from English to Nepali (Devanagari script).
Keep the same JSON structure. Translate all text values to natural Nepali using common political/news terminology.
Keep sentiment values in English (positive/negative/neutral). Keep icon emojis unchanged. Keep source names in their original form.
Return ONLY valid JSON, no markdown.`;

  const userPrompt = JSON.stringify(briefing, null, 2);

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    return parseJSON<AIBriefingResponse>(response.content);
  } catch (err) {
    console.warn(
      '[CommitmentBriefing] Nepali translation failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Cache: read/write ────────────────────────────────────────────────────────

async function getCachedBriefing(commitmentId: number): Promise<CommitmentBriefing | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('commitment_briefings')
      .select('*')
      .eq('commitment_id', commitmentId)
      .single();

    if (error || !data) return null;

    // Check staleness
    const generatedAt = new Date(data.generated_at).getTime();
    if (Date.now() - generatedAt > CACHE_TTL_MS) return null;

    return {
      commitmentId: data.commitment_id,
      title: data.title,
      shortSummary: data.short_summary,
      fullBriefing: data.full_briefing,
      fullBriefingNe: data.full_briefing_ne || undefined,
      generatedAt: data.generated_at,
      signalCount: data.signal_count,
      sourceCount: data.source_count,
    };
  } catch {
    // Table may not exist — fall back to metadata approach
    return getCachedBriefingFromMetadata(commitmentId);
  }
}

async function getCachedBriefingFromMetadata(commitmentId: number): Promise<CommitmentBriefing | null> {
  const supabase = getSupabase();

  try {
    const { data } = await supabase
      .from('promises')
      .select('metadata')
      .eq('id', commitmentId)
      .single();

    if (!data?.metadata) return null;

    const meta = data.metadata as Record<string, unknown>;
    const briefing = meta.commitment_briefing as CommitmentBriefing | undefined;
    if (!briefing) return null;

    // Check staleness
    const generatedAt = new Date(briefing.generatedAt).getTime();
    if (Date.now() - generatedAt > CACHE_TTL_MS) return null;

    return briefing;
  } catch {
    return null;
  }
}

async function storeBriefing(briefing: CommitmentBriefing): Promise<void> {
  const supabase = getSupabase();

  // Try dedicated table first
  try {
    const { error } = await supabase
      .from('commitment_briefings')
      .upsert(
        {
          commitment_id: briefing.commitmentId,
          title: briefing.title,
          short_summary: briefing.shortSummary,
          full_briefing: briefing.fullBriefing,
          full_briefing_ne: briefing.fullBriefingNe || null,
          generated_at: briefing.generatedAt,
          signal_count: briefing.signalCount,
          source_count: briefing.sourceCount,
        },
        { onConflict: 'commitment_id' },
      );

    if (!error) return;
  } catch {
    // Table may not exist — fall through to metadata
  }

  // Fallback: store in promise metadata
  try {
    const { data: existing } = await supabase
      .from('promises')
      .select('metadata')
      .eq('id', briefing.commitmentId)
      .single();

    const currentMeta = (existing?.metadata as Record<string, unknown>) || {};

    await supabase
      .from('promises')
      .update({
        metadata: {
          ...currentMeta,
          commitment_briefing: briefing,
        },
      })
      .eq('id', briefing.commitmentId);
  } catch (err) {
    console.warn(
      '[CommitmentBriefing] Failed to store briefing:',
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a fresh commitment briefing by synthesizing all matched signals.
 */
export async function generateCommitmentBriefing(
  commitmentId: number,
): Promise<CommitmentBriefing | null> {
  const [commitment, signals] = await Promise.all([
    fetchCommitment(commitmentId),
    fetchCommitmentSignals(commitmentId),
  ]);

  if (!commitment) {
    console.warn(`[CommitmentBriefing] Commitment ${commitmentId} not found`);
    return null;
  }

  // Short summary from existing data
  const shortSummary =
    commitment.summary || commitment.description || 'No summary available.';

  // If no signals, return a minimal briefing
  if (signals.length === 0) {
    const briefing: CommitmentBriefing = {
      commitmentId,
      title: commitment.title,
      shortSummary,
      fullBriefing: {
        whatsHappening:
          'No intelligence signals have been matched to this commitment yet. The system is continuously scanning news sources and will generate a full briefing once relevant coverage is detected.',
        whosSayingWhat: [],
        keyNumbers: [],
        whatToWatch:
          'Monitor for initial government announcements, budget allocations, or media coverage related to this commitment.',
      },
      generatedAt: new Date().toISOString(),
      signalCount: 0,
      sourceCount: 0,
    };

    await storeBriefing(briefing);
    return briefing;
  }

  // Unique sources
  const uniqueSources = new Set(signals.map((s) => s.source_id));

  // Generate AI briefing
  const aiBriefing = await generateAIBriefing(commitment, signals);

  if (!aiBriefing) {
    // Fallback: create a basic briefing without AI
    const briefing: CommitmentBriefing = {
      commitmentId,
      title: commitment.title,
      shortSummary,
      fullBriefing: {
        whatsHappening: `${signals.length} intelligence signals from ${uniqueSources.size} sources have been matched to this commitment. The most recent signal was discovered on ${signals[0].discovered_at.slice(0, 10)}.`,
        whosSayingWhat: signals.slice(0, 5).map((s) => ({
          source: s.source_id,
          quote: s.content_summary || s.title,
          date: s.discovered_at.slice(0, 10),
          sentiment: 'neutral' as const,
        })),
        keyNumbers: [
          { icon: '\u{1F4CA}', label: 'Signals tracked', value: String(signals.length) },
          { icon: '\u{1F4CD}', label: 'Sources', value: String(uniqueSources.size) },
        ],
        whatToWatch:
          'AI analysis is temporarily unavailable. Check back shortly for a full synthesized briefing.',
      },
      generatedAt: new Date().toISOString(),
      signalCount: signals.length,
      sourceCount: uniqueSources.size,
    };

    await storeBriefing(briefing);
    return briefing;
  }

  // Generate Nepali translation
  const nepBriefing = await translateBriefingToNepali(aiBriefing);

  const briefing: CommitmentBriefing = {
    commitmentId,
    title: commitment.title,
    shortSummary,
    fullBriefing: aiBriefing,
    fullBriefingNe: nepBriefing || undefined,
    generatedAt: new Date().toISOString(),
    signalCount: signals.length,
    sourceCount: uniqueSources.size,
  };

  // Cache it
  await storeBriefing(briefing);

  return briefing;
}

/**
 * Get a cached commitment briefing if fresh, otherwise generate a new one.
 * Returns cached briefing if less than 6 hours old.
 */
export async function getCommitmentBriefing(
  commitmentId: number,
): Promise<CommitmentBriefing | null> {
  // Try cache first
  const cached = await getCachedBriefing(commitmentId);
  if (cached) return cached;

  // Generate fresh
  return generateCommitmentBriefing(commitmentId);
}

/**
 * Generate briefings for multiple commitments (used by sweep jobs).
 * Processes sequentially to avoid overwhelming AI providers.
 */
export async function generateBriefingBatch(
  commitmentIds: number[],
): Promise<{ generated: number; failed: number; errors: string[] }> {
  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of commitmentIds) {
    try {
      const result = await generateCommitmentBriefing(id);
      if (result) {
        generated++;
      } else {
        failed++;
        errors.push(`Commitment ${id}: generation returned null`);
      }
    } catch (err) {
      failed++;
      errors.push(
        `Commitment ${id}: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }

    // Rate limiting pause between AI calls
    await new Promise((r) => setTimeout(r, 500));
  }

  return { generated, failed, errors };
}
