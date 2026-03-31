/**
 * Impact Predictor — AI-powered predictions of real-world impact
 * when a government commitment is fully completed.
 *
 * Generates structured predictions with before/after metrics,
 * category-specific impacts, beneficiary analysis, and bilingual output.
 *
 * Includes caching (7-day TTL), Nepali translation, and batch generation.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ImpactPrediction {
  commitmentId: number;
  title: string;

  // The vision
  summaryEn: string;           // 2-3 sentence overview of impact
  summaryNe: string;           // Nepali version

  // Specific impacts
  impacts: {
    category: 'economic' | 'social' | 'infrastructure' | 'governance' | 'environment' | 'health' | 'education';
    icon: string;              // emoji
    titleEn: string;           // "Lower water bills"
    titleNe: string;
    descriptionEn: string;     // "Average household saves Rs 2,000/month on tanker water"
    descriptionNe: string;
    affectedPeople: string;    // "2.5 million Kathmandu valley residents"
    confidence: 'high' | 'medium' | 'speculative';
  }[];

  // Before vs After
  beforeAfter: {
    metric: string;            // "Water availability"
    before: string;            // "4 hours/day"
    after: string;             // "24/7"
    source?: string;           // where this estimate comes from
  }[];

  // Timeline
  estimatedCompletion: string; // "December 2027"

  // Who benefits most
  primaryBeneficiaries: string[];  // ["Kathmandu valley residents", "Low-income households"]

  generatedAt: string;
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

interface AIImpactResponse {
  summaryEn: string;
  impacts: {
    category: 'economic' | 'social' | 'infrastructure' | 'governance' | 'environment' | 'health' | 'education';
    icon: string;
    titleEn: string;
    descriptionEn: string;
    affectedPeople: string;
    confidence: 'high' | 'medium' | 'speculative';
  }[];
  beforeAfter: {
    metric: string;
    before: string;
    after: string;
    source?: string;
  }[];
  estimatedCompletion: string;
  primaryBeneficiaries: string[];
}

interface AITranslationResponse {
  summaryNe: string;
  impacts: {
    titleNe: string;
    descriptionNe: string;
  }[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

// ── Core: fetch data ─────────────────────────────────────────────────────────

async function fetchCommitmentSignals(commitmentId: number): Promise<RawSignal[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, content, content_summary, source_id, url, discovered_at, classification, extracted_data',
    )
    .contains('matched_promise_ids', [commitmentId])
    .order('discovered_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('[ImpactPredictor] Failed to fetch signals:', error.message);
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

// ── Core: generate AI impact prediction ──────────────────────────────────────

async function generateAIImpact(
  commitment: RawCommitment,
  signals: RawSignal[],
): Promise<AIImpactResponse | null> {
  const signalContext = signals
    .slice(0, 10)
    .map((s, i) => {
      const content = s.content_summary || (s.content || '').slice(0, 300);
      return `${i + 1}. [${s.discovered_at.slice(0, 10)}] ${content}`;
    })
    .join('\n');

  const systemPrompt = `You are an expert policy analyst specializing in Nepal's development.

Given this government commitment: ${commitment.title}
Description: ${commitment.description || 'No description available'}
Category: ${commitment.category || 'unknown'}
Current progress: ${commitment.progress ?? 0}%
Current status: ${commitment.status || 'unknown'}

${signals.length > 0 ? `Recent developments:\n${signalContext}` : 'No recent news signals available.'}

Predict the real-world impact when this commitment is FULLY completed.
Be specific to Nepal's context. Use real numbers where possible.
Think about:
- How many people are affected and where they live
- What changes in their daily life (before vs after)
- Economic impact (jobs, costs, savings)
- Social impact (quality of life, access, equality)
- What could go wrong (risks)

Be optimistic but realistic. Don't over-promise.
Return structured JSON matching this schema EXACTLY:
{
  "summaryEn": "2-3 sentence overview of the impact when completed",
  "impacts": [
    {
      "category": "economic|social|infrastructure|governance|environment|health|education",
      "icon": "emoji",
      "titleEn": "Short impact title",
      "descriptionEn": "1-2 sentence specific description with numbers",
      "affectedPeople": "who and how many",
      "confidence": "high|medium|speculative"
    }
  ],
  "beforeAfter": [
    {
      "metric": "What is measured",
      "before": "Current state",
      "after": "State when completed",
      "source": "Where this estimate comes from (optional)"
    }
  ],
  "estimatedCompletion": "Month Year estimate",
  "primaryBeneficiaries": ["Group 1", "Group 2", "Group 3"]
}

RULES:
- Include 3-5 specific impacts with different categories
- Include 3-5 before/after metrics
- Use Nepal-specific data: NPR currency, Nepal geography, local context
- Confidence: "high" = based on official data/plans, "medium" = reasonable inference, "speculative" = educated guess
- Affected people should be specific: "2.5 million Kathmandu valley residents" not just "many people"
- Before/after should use concrete numbers where possible
- Return ONLY valid JSON, no markdown`;

  const userPrompt = `Generate the impact prediction for this commitment.`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    return parseJSON<AIImpactResponse>(response.content);
  } catch (err) {
    console.error(
      '[ImpactPredictor] AI impact generation failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Core: translate to Nepali ────────────────────────────────────────────────

async function translateImpactToNepali(
  impact: AIImpactResponse,
): Promise<AITranslationResponse | null> {
  const toTranslate = {
    summaryEn: impact.summaryEn,
    impacts: impact.impacts.map((i) => ({
      titleEn: i.titleEn,
      descriptionEn: i.descriptionEn,
    })),
  };

  const systemPrompt = `You are a professional translator. Translate the following impact prediction text from English to Nepali (Devanagari script).
Translate naturally using common Nepali political/development terminology.
Keep numbers and proper nouns in their original form.
Return JSON with this structure:
{
  "summaryNe": "translated summary",
  "impacts": [
    { "titleNe": "translated title", "descriptionNe": "translated description" }
  ]
}
Return ONLY valid JSON, no markdown.`;

  const userPrompt = JSON.stringify(toTranslate, null, 2);

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    return parseJSON<AITranslationResponse>(response.content);
  } catch (err) {
    console.warn(
      '[ImpactPredictor] Nepali translation failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ── Cache: read/write ────────────────────────────────────────────────────────

interface CacheReadOptions {
  allowStale?: boolean;
}

async function getCachedPrediction(
  commitmentId: number,
  options?: CacheReadOptions,
): Promise<ImpactPrediction | null> {
  const supabase = getSupabase();
  const allowStale = options?.allowStale === true;

  // Try dedicated table first
  try {
    const { data, error } = await supabase
      .from('impact_predictions')
      .select('*')
      .eq('commitment_id', commitmentId)
      .single();

    if (!error && data) {
      const generatedAt = new Date(data.generated_at).getTime();
      if (allowStale || Date.now() - generatedAt <= CACHE_TTL_MS) {
        return {
          commitmentId: data.commitment_id,
          title: data.title,
          summaryEn: data.summary_en,
          summaryNe: data.summary_ne || '',
          impacts: data.impacts || [],
          beforeAfter: data.before_after || [],
          estimatedCompletion: data.estimated_completion || '',
          primaryBeneficiaries: data.primary_beneficiaries || [],
          generatedAt: data.generated_at,
        };
      }
      return null; // stale
    }
  } catch {
    // Table may not exist — fall through to metadata
  }

  // Fallback: check promise metadata
  try {
    const { data } = await supabase
      .from('promises')
      .select('metadata')
      .eq('id', commitmentId)
      .single();

    if (!data?.metadata) return null;

    const meta = data.metadata as Record<string, unknown>;
    const prediction = meta.impact_prediction as ImpactPrediction | undefined;
    if (!prediction) return null;

    const generatedAt = new Date(prediction.generatedAt).getTime();
    if (!allowStale && Date.now() - generatedAt > CACHE_TTL_MS) return null;

    return prediction;
  } catch {
    return null;
  }
}

export async function getCachedImpactPrediction(
  commitmentId: number,
  options?: CacheReadOptions,
): Promise<ImpactPrediction | null> {
  return getCachedPrediction(commitmentId, options);
}

async function storePrediction(prediction: ImpactPrediction): Promise<void> {
  const supabase = getSupabase();

  // Try dedicated table first
  try {
    const { error } = await supabase
      .from('impact_predictions')
      .upsert(
        {
          commitment_id: prediction.commitmentId,
          title: prediction.title,
          summary_en: prediction.summaryEn,
          summary_ne: prediction.summaryNe,
          impacts: prediction.impacts,
          before_after: prediction.beforeAfter,
          estimated_completion: prediction.estimatedCompletion,
          primary_beneficiaries: prediction.primaryBeneficiaries,
          generated_at: prediction.generatedAt,
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
      .eq('id', prediction.commitmentId)
      .single();

    const currentMeta = (existing?.metadata as Record<string, unknown>) || {};

    await supabase
      .from('promises')
      .update({
        metadata: {
          ...currentMeta,
          impact_prediction: prediction,
        },
      })
      .eq('id', prediction.commitmentId);
  } catch (err) {
    console.warn(
      '[ImpactPredictor] Failed to store prediction:',
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a fresh impact prediction for a commitment.
 */
export async function generateImpactPrediction(
  commitmentId: number,
): Promise<ImpactPrediction | null> {
  const [commitment, signals] = await Promise.all([
    fetchCommitment(commitmentId),
    fetchCommitmentSignals(commitmentId),
  ]);

  if (!commitment) {
    console.warn(`[ImpactPredictor] Commitment ${commitmentId} not found`);
    return null;
  }

  // Generate AI prediction
  const aiImpact = await generateAIImpact(commitment, signals);

  if (!aiImpact) {
    // Return a minimal prediction as fallback
    const prediction: ImpactPrediction = {
      commitmentId,
      title: commitment.title,
      summaryEn: `When completed, this ${commitment.category || 'government'} commitment will deliver meaningful progress for Nepal. Impact analysis is being generated.`,
      summaryNe: '',
      impacts: [],
      beforeAfter: [],
      estimatedCompletion: '',
      primaryBeneficiaries: [],
      generatedAt: new Date().toISOString(),
    };

    await storePrediction(prediction);
    return prediction;
  }

  // Translate to Nepali
  const nepali = await translateImpactToNepali(aiImpact);

  // Merge English + Nepali
  const impacts = aiImpact.impacts.map((impact, i) => ({
    ...impact,
    titleNe: nepali?.impacts?.[i]?.titleNe || '',
    descriptionNe: nepali?.impacts?.[i]?.descriptionNe || '',
  }));

  const prediction: ImpactPrediction = {
    commitmentId,
    title: commitment.title,
    summaryEn: aiImpact.summaryEn,
    summaryNe: nepali?.summaryNe || '',
    impacts,
    beforeAfter: aiImpact.beforeAfter,
    estimatedCompletion: aiImpact.estimatedCompletion,
    primaryBeneficiaries: aiImpact.primaryBeneficiaries,
    generatedAt: new Date().toISOString(),
  };

  // Cache it
  await storePrediction(prediction);

  return prediction;
}

/**
 * Get a cached impact prediction if fresh, otherwise generate a new one.
 * Returns cached prediction if less than 7 days old.
 */
export async function getImpactPrediction(
  commitmentId: number,
): Promise<ImpactPrediction | null> {
  // Try cache first
  const cached = await getCachedPrediction(commitmentId);
  if (cached) return cached;

  // Generate fresh
  return generateImpactPrediction(commitmentId);
}

/**
 * Generate impact predictions for multiple commitments (used by sweep jobs).
 * Processes sequentially to avoid overwhelming AI providers.
 */
export async function generateImpactBatch(
  commitmentIds: number[],
): Promise<{ generated: number; failed: number; errors: string[] }> {
  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of commitmentIds) {
    try {
      const result = await generateImpactPrediction(id);
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
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { generated, failed, errors };
}
