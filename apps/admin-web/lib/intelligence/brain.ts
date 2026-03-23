/**
 * Nepal Najar Intelligence Brain
 *
 * The AI reasoning engine that analyzes signals and updates promises.
 * Uses a 3-tier approach:
 *
 * Tier 1: Quick classification — is this signal relevant to any promise? (cheap model)
 * Tier 2: Deep enrichment — extract full content, get detailed data (medium)
 * Tier 3: Reasoning — cross-reference, infer, update promises (smart model)
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';
import {
  type Classification,
  normalizeClassification,
  needsHumanReview,
} from './types';
import {
  getCommitmentCatalogSummary,
  getCommitmentDetailContext,
  getCurrentDateContext,
} from './commitment-context';

interface Signal {
  id: string;
  source_id: string;
  signal_type: string;
  title: string;
  content: string | null;
  url: string;
  published_at: string | null;
  author: string | null;
  media_type: string | null;
  metadata: Record<string, unknown>;
  matched_promise_ids?: number[] | null;
}

interface ClassificationResult {
  isRelevant: boolean;
  relevanceScore: number;
  matchedPromiseIds: number[];
  classification: Classification;
  reasoning: string;
}

interface DeepAnalysisResult {
  promiseId: number;
  classification:
    | 'confirms'
    | 'contradicts'
    | 'neutral'
    | 'budget_allocation'
    | 'policy_change'
    | 'statement';
  confidence: number;
  reasoning: string;
  extractedData: {
    amounts?: { value: number; currency: string; context: string }[];
    dates?: { date: string; context: string }[];
    percentages?: { value: number; context: string }[];
    officials?: { name: string; title: string; statement: string }[];
    organizations?: string[];
  };
  suggestedStatus?:
    | 'not_started'
    | 'in_progress'
    | 'delivered'
    | 'stalled';
  suggestedProgress?: number;
}

const OBVIOUSLY_IRRELEVANT_PATTERNS = [
  /राशिफल/u,
  /\bhoroscope\b/i,
  /\bcricket\b/i,
  /\bfootball\b/i,
  /\bpremier league\b/i,
  /\bchampions league\b/i,
  /\breal madrid\b/i,
  /\batletico\b/i,
  /\bcarabao cup\b/i,
  /\bmovie\b/i,
  /\bfilm\b/i,
  /\bsong\b/i,
  /\bcelebrity\b/i,
  /\bmatch report\b/i,
];

const GOVERNMENT_CONTEXT_PATTERNS = [
  /सरकार/u,
  /मन्त्रिपरिषद्/u,
  /मन्त्रालय/u,
  /नीति/u,
  /बजेट/u,
  /संघीय/u,
  /नगरपालिका/u,
  /\bgovernment\b/i,
  /\bministry\b/i,
  /\bminister\b/i,
  /\bpolicy\b/i,
  /\bbudget\b/i,
  /\bmunicipality\b/i,
  /\bparliament\b/i,
];

function getSignalText(signal: Pick<Signal, 'title' | 'content'>): string {
  return [signal.title, signal.content || ''].join(' ').trim();
}

function hasGovernmentContext(text: string): boolean {
  return GOVERNMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function isObviouslyIrrelevantSignal(
  signal: Pick<Signal, 'title' | 'content'>,
): boolean {
  const text = getSignalText(signal);
  if (!text) return false;
  if (hasGovernmentContext(text)) return false;
  return OBVIOUSLY_IRRELEVANT_PATTERNS.some((pattern) => pattern.test(text));
}

function requiresTier3(matchedPromiseIds: number[]): boolean {
  return matchedPromiseIds.length > 0;
}

function sanitizeAnalyses(
  analyses: DeepAnalysisResult[],
  allowedPromiseIds: number[],
): DeepAnalysisResult[] {
  const allowed = new Set(allowedPromiseIds);
  const bestByPromise = new Map<number, DeepAnalysisResult>();

  for (const analysis of analyses) {
    if (!allowed.has(analysis.promiseId)) continue;
    if (!Number.isFinite(analysis.confidence) || analysis.confidence <= 0) continue;
    if (!analysis.reasoning || analysis.reasoning.trim().length === 0) continue;

    const normalized: DeepAnalysisResult = {
      ...analysis,
      classification: normalizeClassification(analysis.classification),
      confidence: Math.max(0, Math.min(1, analysis.confidence)),
      reasoning: analysis.reasoning.trim(),
    };

    const existing = bestByPromise.get(normalized.promiseId);
    if (!existing || normalized.confidence > existing.confidence) {
      bestByPromise.set(normalized.promiseId, normalized);
    }
  }

  return [...bestByPromise.values()];
}

// TIER 1: Quick classification (uses cheap/free model)
export async function tier1Classify(
  signal: Signal,
): Promise<ClassificationResult> {
  if (isObviouslyIrrelevantSignal(signal)) {
    return {
      isRelevant: false,
      relevanceScore: 0.05,
      matchedPromiseIds: [],
      classification: 'neutral',
      reasoning: 'Rejected by lexical guardrail as obvious non-government content.',
    };
  }

  const commitmentCatalog = await getCommitmentCatalogSummary();
  const systemPrompt = `You are an intelligence analyst for Nepal Najar, a government promise tracker.
You analyze signals (news articles, social media posts, videos, documents, interviews, transcripts, and official notices) to determine if they are relevant to Nepal Najar's tracked government commitments.

Nepal Najar tracks a DYNAMIC commitment universe: seeded commitments plus reviewed or candidate discoveries.
Known tracked commitments right now (${commitmentCatalog.total} total):
${commitmentCatalog.lines.join('\n')}

CLASSIFICATION RULES — BE AGGRESSIVE:
- If a signal mentions ANY government activity, policy, budget, minister, ministry, or government institution → it IS relevant (relevanceScore >= 0.4)
- If a signal mentions specific sectors like health, education, infrastructure, economy, corruption, tourism, energy, agriculture → match to the closest tracked commitments
- "neutral" should ONLY be used for entertainment, sports (unless government sports policy), celebrity gossip, or completely unrelated content
- DEFAULT TO RELEVANT when in doubt. We'd rather have false positives than miss real evidence.
- A relevanceScore below 0.3 should be RARE — only for truly unrelated content.
- If a signal appears relevant to government accountability but does NOT clearly match any known commitment, keep it relevant and return an empty matchedPromiseIds array instead of forcing a bad match.
- Only return commitment IDs from the provided catalog. Do not invent new IDs.

NEPALI CONTENT HANDLING:
- Many signals will be in Nepali (Devanagari script). You MUST read and understand Nepali text.
- Match Nepali keywords to English promise titles and vice versa.
- Consider that the same concept may be expressed differently in Nepali vs English.
- "अर्ब" = billion NPR, "करोड" = 10 million NPR, "लाख" = 100,000 NPR.
- Dates may be in Bikram Sambat (BS) calendar — note the BS date and approximate AD equivalent in your reasoning.
- Government ministry names appear in both languages — match them correctly.

TEMPORAL DISCIPLINE:
- ${getCurrentDateContext()}
- Do not rely on stale political memory.
- If the signal does not establish a fact, say so in reasoning instead of guessing.

Respond in JSON format ONLY:
{
  "isRelevant": boolean,
  "relevanceScore": 0.0-1.0,
  "matchedPromiseIds": [number],
  "classification": "confirms|contradicts|neutral|budget_allocation|policy_change|statement",
  "reasoning": "brief explanation"
}`;

  const userPrompt = `Analyze this signal:
Type: ${signal.signal_type}
Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 2000)}
Source: ${signal.source_id}
Date: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}`;

  try {
    const response = await aiComplete('classify', systemPrompt, userPrompt);
    const parsed = parseJSON<ClassificationResult>(response.content);
    if (!parsed) {
      return {
        isRelevant: false,
        relevanceScore: 0,
        matchedPromiseIds: [],
        classification: 'neutral',
        reasoning: 'Failed to parse AI response',
      };
    }

    const normalizedMatches = Array.isArray(parsed.matchedPromiseIds)
      ? parsed.matchedPromiseIds
          .map((value) => Number(value))
          .filter(
            (value) =>
              Number.isFinite(value) && commitmentCatalog.knownIds.has(value),
          )
      : [];

    const normalizedResult: ClassificationResult = {
      ...parsed,
      classification: normalizeClassification(parsed.classification),
      relevanceScore:
        typeof parsed.relevanceScore === 'number' ? parsed.relevanceScore : 0,
      matchedPromiseIds: normalizedMatches,
    };

    if (isObviouslyIrrelevantSignal(signal)) {
      return {
        isRelevant: false,
        relevanceScore: 0.05,
        matchedPromiseIds: [],
        classification: 'neutral',
        reasoning:
          'AI output overridden by lexical guardrail due to obvious non-government content.',
      };
    }

    return {
      ...normalizedResult,
      isRelevant:
        normalizedResult.isRelevant &&
        (normalizedResult.relevanceScore >= 0.3 ||
          normalizedResult.matchedPromiseIds.length > 0),
    };
  } catch (err) {
    return {
      isRelevant: false,
      relevanceScore: 0,
      matchedPromiseIds: [],
      classification: 'neutral',
      reasoning: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

// TIER 3: Deep reasoning (uses smart model)
export async function tier3Analyze(
  signal: Signal,
  relatedSignals: Signal[],
): Promise<DeepAnalysisResult[]> {
  const matchedPromiseIds = ((signal.matched_promise_ids as number[] | null) || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const detailedCommitmentContext = await getCommitmentDetailContext(
    matchedPromiseIds,
  );
  const systemPrompt = `You are a senior intelligence analyst for Nepal Najar, a government promise tracker for Nepal.

Your job is to deeply analyze evidence and determine its impact on specific government promises. You must:
1. Understand the INTENT behind each promise, not just keywords
2. Extract specific data: budget amounts (NPR), dates, percentages, official names
3. Detect indirect evidence (e.g., "Ministry allocated NPR 5B for roads" -> Promise #15 highway is progressing)
4. Identify contradictions (e.g., official says "on track" but budget was cut)
5. Consider the source reliability and cross-reference with other signals
6. Suggest status changes with reasoning — BE PROACTIVE about suggesting status changes

ANALYSIS RULES — BE AGGRESSIVE:
- If there is ANY indication of government action on a promise, suggest "in_progress" status
- If budget has been allocated to a sector, that counts as progress — suggest 5-15% progress minimum
- If a minister makes a statement about plans, that counts as "statement" classification with suggestedStatus "in_progress"
- If a bill is tabled or committee is formed, suggest 10-20% progress
- If construction/implementation has begun, suggest 20-40% progress
- If an initiative is launched/inaugurated, suggest 30-50% progress
- If measurable outcomes are reported, suggest 50-80% progress
- Only suggest "stalled" if there is CLEAR evidence of delay, cancellation, or opposition blocking
- Extract ALL data points — amounts, dates, percentages, officials, organizations. Be thorough.
- When multiple matched commitments could be affected, create analysis entries for ALL of them, not just the primary one
- Confidence should be >= 0.4 for any direct government action, >= 0.3 for indirect evidence

MATCHED COMMITMENT CONTEXT:
${detailedCommitmentContext}

${
  relatedSignals.length > 0
    ? `
CORROBORATING SIGNALS (from other sources):
${relatedSignals.map((s) => `- [${s.signal_type}] "${s.title}" (${s.source_id}, ${s.published_at})`).join('\n')}
`
    : ''
}

NEPALI CONTENT:
- If the signal is in Nepali, translate the key claims to English in your reasoning.
- Match Nepali official names to their English equivalents (e.g., प्रधानमन्त्री = Prime Minister).
- Budget amounts: "अर्ब" = billion, "करोड" = 10 million, "लाख" = 100,000 NPR.
- Dates in Bikram Sambat (BS): Convert to AD equivalent (BS 2082 ≈ AD 2025-2026).

TEMPORAL DISCIPLINE:
- ${getCurrentDateContext()}
- Do not rely on stale political assumptions or officeholder names unless the signal supports them.
- If none of the matched commitments are actually affected, return an empty JSON array instead of forcing a weak analysis.

Respond with a JSON array of analysis results, one per matched promise:
[{
  "promiseId": number,
  "classification": "confirms|contradicts|neutral|budget_allocation|policy_change|statement",
  "confidence": 0.0-1.0,
  "reasoning": "detailed reasoning chain",
  "extractedData": {
    "amounts": [{"value": number, "currency": "NPR", "context": "description"}],
    "dates": [{"date": "YYYY-MM-DD", "context": "description"}],
    "percentages": [{"value": number, "context": "description"}],
    "officials": [{"name": "string", "title": "string", "statement": "what they said"}],
    "organizations": ["string"]
  },
  "suggestedStatus": "not_started|in_progress|delivered|stalled" or null,
  "suggestedProgress": 0-100 or null
}]`;

  const userPrompt = `ANALYZE THIS SIGNAL IN DEPTH:

Type: ${signal.signal_type}
Title: ${signal.title}
Full Content:
${(signal.content || signal.title).slice(0, 8000)}

Source: ${signal.source_id}
Published: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}
URL: ${signal.url}

What does this mean for the government promises? Be thorough and specific.`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    const parsed = parseJSON<DeepAnalysisResult[]>(response.content);
    return parsed || [];
  } catch {
    return [];
  }
}

// Cross-reference engine — finds related signals
export async function findCorroboratingSignals(
  signal: Signal,
  promiseIds: number[],
): Promise<Signal[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('intelligence_signals')
    .select('*')
    .overlaps('matched_promise_ids', promiseIds)
    .neq('id', signal.id)
    .gte('relevance_score', 0.3)
    .order('published_at', { ascending: false })
    .limit(10);

  return (data || []) as unknown as Signal[];
}

// Main processing pipeline
export async function processSignalsBatch(
  batchSize = 10,
): Promise<{
  tier1Processed: number;
  tier3Processed: number;
  promisesUpdated: number;
  totalCostUsd: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  let tier1Processed = 0;
  let tier3Processed = 0;
  let promisesUpdated = 0;
  const totalCostUsd = 0;
  const errors: string[] = [];

  // TIER 1: Classify unprocessed signals
  const { data: unclassified } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('tier1_processed', false)
    .order('discovered_at', { ascending: false })
    .limit(batchSize * 2);

  if (unclassified) {
    for (const signal of unclassified) {
      try {
        const result = await tier1Classify(signal as unknown as Signal);

        await supabase
          .from('intelligence_signals')
          .update({
            tier1_processed: true,
            tier3_processed:
              result.isRelevant && !requiresTier3(result.matchedPromiseIds),
            relevance_score: result.relevanceScore,
            matched_promise_ids: result.matchedPromiseIds,
            classification: normalizeClassification(result.classification),
            reasoning: result.reasoning,
            review_required: needsHumanReview({
              confidence: null,
              relevanceScore: result.relevanceScore,
              matchedPromiseIds: result.matchedPromiseIds,
            }),
          })
          .eq('id', signal.id);

        tier1Processed++;
      } catch (err) {
        errors.push(
          `Tier1 ${signal.id}: ${err instanceof Error ? err.message : 'error'}`,
        );
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // TIER 3: Deep analysis on relevant signals
  const { data: relevant } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('tier1_processed', true)
    .eq('tier3_processed', false)
    .gte('relevance_score', 0.3)
    .order('relevance_score', { ascending: false })
    .limit(batchSize);

  if (relevant) {
    const tier3Candidates = relevant.filter((signal) =>
      Array.isArray(signal.matched_promise_ids) &&
      signal.matched_promise_ids.length > 0,
    );

    for (const signal of tier3Candidates) {
      try {
        const matchedPromiseIds =
          ((signal.matched_promise_ids as number[] | null) || [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));

        // Find corroborating signals
        const corroborating = await findCorroboratingSignals(
          signal as unknown as Signal,
          matchedPromiseIds,
        );

        const analyses = sanitizeAnalyses(
          await tier3Analyze(
            signal as unknown as Signal,
            corroborating,
          ),
          matchedPromiseIds,
        );

        const primaryAnalysis = analyses[0];
        const normalizedClass = primaryAnalysis
          ? normalizeClassification(primaryAnalysis.classification)
          : normalizeClassification(signal.classification);
        const confidence = primaryAnalysis?.confidence || 0;

        await supabase
          .from('intelligence_signals')
          .update({
            tier3_processed: true,
            confidence,
            classification: normalizedClass,
            reasoning:
              primaryAnalysis?.reasoning || signal.reasoning,
            extracted_data: primaryAnalysis?.extractedData || {},
            corroborated_by: corroborating.map((s) => s.id),
            review_required: needsHumanReview({
              confidence,
              relevanceScore: signal.relevance_score as number | null,
              matchedPromiseIds,
            }),
          })
          .eq('id', signal.id);

        // Create promise updates
        for (const analysis of analyses) {
          await supabase.from('promise_updates').insert({
            promise_id: String(analysis.promiseId),
            article_id: null,
            field_changed: analysis.classification,
            new_value: JSON.stringify({
              signalId: signal.id,
              sourceId: signal.source_id,
              sourceUrl: signal.url,
              publishedAt: signal.published_at,
              confidence: analysis.confidence,
              suggestedStatus: analysis.suggestedStatus,
              suggestedProgress: analysis.suggestedProgress,
              extractedData: analysis.extractedData,
            }),
            change_reason: analysis.reasoning,
          });

          promisesUpdated++;
        }

        tier3Processed++;
      } catch (err) {
        errors.push(
          `Tier3 ${signal.id}: ${err instanceof Error ? err.message : 'error'}`,
        );
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return {
    tier1Processed,
    tier3Processed,
    promisesUpdated,
    totalCostUsd,
    errors,
  };
}

function parseJSON<T>(text: string): T | null {
  try {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
