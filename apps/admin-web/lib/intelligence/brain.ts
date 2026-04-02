/**
 * Nepal Republic Intelligence Brain
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
import { extractEntities, type ExtractedEntities } from './entity-extractor';
import { extractProgress } from './progress-extractor';
import { getRelevantCorrections } from './ai-feedback';
import { hasCorruptionLanguage } from './corruption-discovery';

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
  review_status?: string | null;
  review_required?: boolean | null;
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

function getAnalysisLookbackCutoff(): string | null {
  const configured = Number.parseInt(
    process.env.INTELLIGENCE_ANALYSIS_LOOKBACK_HOURS || '168',
    10,
  );
  if (!Number.isFinite(configured)) {
    return new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString();
  }
  if (configured <= 0) return null;
  return new Date(Date.now() - configured * 60 * 60 * 1000).toISOString();
}

function nextReviewStatus(
  reviewRequired: boolean,
  existing: unknown,
): 'pending' | 'approved' | 'edited' | 'rejected' {
  const normalized =
    typeof existing === 'string' ? existing.toLowerCase() : 'pending';

  if (
    normalized === 'approved' ||
    normalized === 'edited' ||
    normalized === 'rejected'
  ) {
    return normalized;
  }

  return reviewRequired ? 'pending' : 'approved';
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

// Build the shared system prompt for tier-1 classification
async function buildTier1SystemPrompt(): Promise<{
  systemPrompt: string;
  commitmentCatalog: Awaited<ReturnType<typeof getCommitmentCatalogSummary>>;
}> {
  const commitmentCatalog = await getCommitmentCatalogSummary();
  const systemPrompt = `You are an intelligence analyst for Nepal Republic, a government promise tracker.
You analyze signals (news articles, social media posts, videos, documents, interviews, transcripts, and official notices) to determine if they are relevant to Nepal Republic's tracked government commitments.

Nepal Republic tracks a DYNAMIC commitment universe: seeded commitments plus reviewed or candidate discoveries.
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
- If the signal does not establish a fact, say so in reasoning instead of guessing.`;

  return { systemPrompt, commitmentCatalog };
}

// Pre-filter a signal before AI classification; returns a result if skippable, null otherwise
function tier1PreFilter(
  signal: Signal,
): ClassificationResult | null {
  const combinedText = [signal.title || '', signal.content || ''].join('').trim();
  if (combinedText.length < 50) {
    console.log(`[Brain] Skipped signal ${signal.id}: insufficient text (${combinedText.length} chars < 50)`);
    return {
      isRelevant: false,
      relevanceScore: 0,
      matchedPromiseIds: [],
      classification: 'neutral',
      reasoning: `Skipped — signal has only ${combinedText.length} characters of text, below the 50-character minimum for classification.`,
    };
  }

  if (isObviouslyIrrelevantSignal(signal)) {
    return {
      isRelevant: false,
      relevanceScore: 0.05,
      matchedPromiseIds: [],
      classification: 'neutral',
      reasoning: 'Rejected by lexical guardrail as obvious non-government content.',
    };
  }

  return null;
}

// Normalize a raw parsed classification result against the commitment catalog
function normalizeTier1Result(
  parsed: ClassificationResult,
  signal: Signal,
  commitmentCatalog: { knownIds: Set<number> },
): ClassificationResult {
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
}

// Batch classify up to 5 signals in a single AI call
export async function tier1ClassifyBatch(
  signals: Signal[],
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  if (signals.length === 0) return results;

  // Pre-filter: separate signals that need AI from those that can be skipped
  const needsAI: Signal[] = [];
  for (const signal of signals) {
    const preFiltered = tier1PreFilter(signal);
    if (preFiltered) {
      results.set(signal.id, preFiltered);
    } else {
      needsAI.push(signal);
    }
  }

  if (needsAI.length === 0) return results;

  const { systemPrompt, commitmentCatalog } = await buildTier1SystemPrompt();

  // Fetch corrections once for the batch (use combined text)
  const combinedSignalText = needsAI
    .map((s) => getSignalText(s))
    .join(' ')
    .slice(0, 2000);
  const corrections = await getRelevantCorrections({
    signalContent: combinedSignalText,
  });

  const fullSystemPrompt = corrections
    ? `${systemPrompt}\n\nIMPORTANT — Learn from these past corrections by the admin:\n${corrections}\n\nApply these lessons to your classification.`
    : systemPrompt;

  // Build the batched user prompt with numbered signals
  const signalBlocks = needsAI.map((signal, idx) => {
    const signalText = getSignalText(signal);
    const entities = extractEntities(signalText);
    const entityContext = formatEntityContext(entities);

    return `--- SIGNAL ${idx + 1} (ID: ${signal.id}) ---
Type: ${signal.signal_type}
Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 1500)}
Source: ${signal.source_id}
Date: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}
${entityContext}`;
  });

  const batchUserPrompt = `Analyze the following ${needsAI.length} signal(s). For EACH signal, provide a classification result.

${signalBlocks.join('\n\n')}

Respond with a JSON array containing exactly ${needsAI.length} result(s), one per signal in the same order:
[
  {
    "signalIndex": 1,
    "isRelevant": boolean,
    "relevanceScore": 0.0-1.0,
    "matchedPromiseIds": [number],
    "classification": "confirms|contradicts|neutral|budget_allocation|policy_change|statement",
    "reasoning": "brief explanation"
  },
  ...
]`;

  console.log(`[Brain] Batch tier-1 classifying ${needsAI.length} signals in single AI call (catalog ~${commitmentCatalog.lines.length} lines sent once instead of ${needsAI.length} times)`);

  try {
    const response = await aiComplete('classify', fullSystemPrompt, batchUserPrompt);
    const parsed = parseJSON<Array<ClassificationResult & { signalIndex?: number }>>(response.content);

    if (!parsed || !Array.isArray(parsed)) {
      // Batch parse failed — fall back to individual classification
      console.warn(`[Brain] Batch parse failed, falling back to individual classification for ${needsAI.length} signals`);
      for (const signal of needsAI) {
        const individual = await tier1ClassifySingle(signal, fullSystemPrompt, commitmentCatalog);
        results.set(signal.id, individual);
      }
      return results;
    }

    // Map parsed results back to signals
    for (let i = 0; i < needsAI.length; i++) {
      const signal = needsAI[i];
      // Try to match by signalIndex first, fall back to array position
      const resultEntry = parsed.find((r) => r.signalIndex === i + 1) || parsed[i];

      if (!resultEntry) {
        console.warn(`[Brain] No batch result for signal ${signal.id} at index ${i}, falling back to individual`);
        const individual = await tier1ClassifySingle(signal, fullSystemPrompt, commitmentCatalog);
        results.set(signal.id, individual);
        continue;
      }

      results.set(signal.id, normalizeTier1Result(resultEntry, signal, commitmentCatalog));
    }

    const savedCalls = needsAI.length - 1;
    console.log(`[Brain] Batch complete: ${needsAI.length} signals classified, saved ${savedCalls} AI call(s) and ~${savedCalls * commitmentCatalog.lines.length} catalog lines of token overhead`);

    return results;
  } catch (err) {
    // Full batch failed — fall back to individual classification
    console.warn(`[Brain] Batch AI call failed (${err instanceof Error ? err.message : 'unknown'}), falling back to individual classification`);
    for (const signal of needsAI) {
      try {
        const individual = await tier1ClassifySingle(signal, fullSystemPrompt, commitmentCatalog);
        results.set(signal.id, individual);
      } catch (individualErr) {
        results.set(signal.id, {
          isRelevant: false,
          relevanceScore: 0,
          matchedPromiseIds: [],
          classification: 'neutral',
          reasoning: `Error: ${individualErr instanceof Error ? individualErr.message : 'unknown'}`,
        });
      }
    }
    return results;
  }
}

// Single-signal classification with a pre-built system prompt (used internally by batch and fallback)
async function tier1ClassifySingle(
  signal: Signal,
  systemPrompt: string,
  commitmentCatalog: { knownIds: Set<number> },
): Promise<ClassificationResult> {
  const signalText = getSignalText(signal);
  const entities = extractEntities(signalText);
  const entityContext = formatEntityContext(entities);

  const userPrompt = `Analyze this signal:
Type: ${signal.signal_type}
Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 2000)}
Source: ${signal.source_id}
Date: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}
${entityContext}

Respond in JSON format ONLY:
{
  "isRelevant": boolean,
  "relevanceScore": 0.0-1.0,
  "matchedPromiseIds": [number],
  "classification": "confirms|contradicts|neutral|budget_allocation|policy_change|statement",
  "reasoning": "brief explanation"
}`;

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
    return normalizeTier1Result(parsed, signal, commitmentCatalog);
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

// Single-signal entry point (backward compatible). Delegates to batch function with batch of 1.
export async function tier1Classify(
  signal: Signal,
): Promise<ClassificationResult> {
  const batchResults = await tier1ClassifyBatch([signal]);
  return batchResults.get(signal.id) || {
    isRelevant: false,
    relevanceScore: 0,
    matchedPromiseIds: [],
    classification: 'neutral',
    reasoning: 'Batch returned no result for this signal',
  };
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
  const systemPrompt = `You are a senior intelligence analyst for Nepal Republic, a government promise tracker for Nepal.

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

  // Fetch relevant past corrections for matched commitments
  const signalTextForCorrections = getSignalText(signal);
  const primaryCommitmentId = matchedPromiseIds[0] || undefined;
  const tier3Corrections = await getRelevantCorrections({
    signalContent: signalTextForCorrections,
    commitmentId: primaryCommitmentId,
  });

  const fullSystemPrompt = tier3Corrections
    ? `${systemPrompt}\n\nIMPORTANT — Learn from these past corrections by the admin:\n${tier3Corrections}\n\nApply these lessons to your analysis.`
    : systemPrompt;

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
    const response = await aiComplete('reason', fullSystemPrompt, userPrompt);
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

  // TIER 1: Classify unprocessed signals (lookback window is configurable)
  const tier1Cutoff = getAnalysisLookbackCutoff();
  let tier1Query = supabase
    .from('intelligence_signals')
    .select('*')
    .eq('tier1_processed', false)
    .order('discovered_at', { ascending: false })
    .limit(batchSize * 2);
  if (tier1Cutoff) {
    tier1Query = tier1Query.gte('discovered_at', tier1Cutoff);
  }
  const { data: unclassified } = await tier1Query;

  if (unclassified) {
    // Chunk signals into batches of 5 for efficient AI classification
    const TIER1_BATCH_SIZE = 5;
    const corruptionCandidates: string[] = [];

    // Collect signal IDs needing summaries (generated after all classification is done)
    const signalsNeedingSummary: string[] = [];

    // Process chunks in parallel (3 at a time to respect rate limits)
    const chunks: (typeof unclassified)[] = [];
    for (let i = 0; i < unclassified.length; i += TIER1_BATCH_SIZE) {
      chunks.push(unclassified.slice(i, i + TIER1_BATCH_SIZE));
    }

    // Use fewer parallel chunks for free-tier models (OpenRouter/Qwen) to avoid rate limits
    const isFreeTier = Boolean(process.env.OPENROUTER_API_KEY) && !process.env.OPENAI_API_KEY;
    const PARALLEL_CHUNKS = isFreeTier ? 1 : 3;
    const INTER_BATCH_DELAY_MS = isFreeTier ? 2000 : 200; // 2s delay for free tier
    for (let c = 0; c < chunks.length; c += PARALLEL_CHUNKS) {
      // Rate-limit delay between batches to avoid timeout/429 errors
      if (c > 0) {
        await new Promise(resolve => setTimeout(resolve, INTER_BATCH_DELAY_MS));
      }
      const parallelBatch = chunks.slice(c, c + PARALLEL_CHUNKS);

      const chunkResults = await Promise.allSettled(
        parallelBatch.map(async (chunk) => {
          const typedChunk = chunk as unknown as Signal[];
          const batchResults = await tier1ClassifyBatch(typedChunk);

          for (const signal of chunk) {
            const result = batchResults.get(signal.id);
            if (!result) {
              errors.push(`Tier1 ${signal.id}: no result from batch`);
              continue;
            }

            try {
              const reviewRequired = needsHumanReview({
                confidence: null,
                relevanceScore: result.relevanceScore,
                matchedPromiseIds: result.matchedPromiseIds,
              });
              const reviewStatus = nextReviewStatus(
                reviewRequired,
                (signal as unknown as Signal).review_status,
              );

              const existingMetadata = (signal as any).metadata || {};
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
                  review_required: reviewRequired,
                  review_status: reviewStatus,
                  metadata: {
                    ...existingMetadata,
                    tier1_scanned_at: new Date().toISOString(),
                    tier1_scan_version: '2026-03-30',
                  },
                })
                .eq('id', signal.id);

              // Queue for summary generation (done in batch after all classification)
              if (result.isRelevant && result.relevanceScore >= 0.3) {
                signalsNeedingSummary.push(signal.id as string);
              }

              // Flag for corruption discovery if relevant + has corruption keywords
              if (
                result.relevanceScore >= 0.3 &&
                hasCorruptionLanguage(signal as unknown as Signal) &&
                !(
                  (signal.metadata as Record<string, unknown>)
                    ?.potential_corruption_case
                )
              ) {
                corruptionCandidates.push(signal.id as string);
              }

              tier1Processed++;
            } catch (err) {
              errors.push(
                `Tier1 ${signal.id}: ${err instanceof Error ? err.message : 'error'}`,
              );
            }
          }
        }),
      );

      // Log any chunk-level failures
      for (const result of chunkResults) {
        if (result.status === 'rejected') {
          errors.push(`Tier1 batch: ${result.reason?.message || 'error'}`);
        }
      }
    }

    // Queue corruption discovery jobs for flagged signals
    if (corruptionCandidates.length > 0) {
      console.log(
        `[Brain] Queueing ${corruptionCandidates.length} signal(s) for corruption discovery`,
      );
      for (const signalId of corruptionCandidates) {
        try {
          await supabase.from('intelligence_jobs').insert({
            job_type: 'discover_corruption',
            status: 'pending',
            priority: 45,
            dedupe_key: `discover-corruption:${signalId}`,
            payload: { signalId },
            max_attempts: 3,
            available_at: new Date().toISOString(),
          });
        } catch {
          // Non-fatal -- job may already exist (dedupe)
        }
      }
    }

    // Generate summaries in parallel (non-blocking, after all classification done)
    if (signalsNeedingSummary.length > 0) {
      const SUMMARY_PARALLEL = 5;
      for (let s = 0; s < signalsNeedingSummary.length; s += SUMMARY_PARALLEL) {
        const batch = signalsNeedingSummary.slice(s, s + SUMMARY_PARALLEL);
        await Promise.allSettled(
          batch.map((id) => generateSignalSummary(id).catch(() => {})),
        );
      }
    }
  }

  // TIER 3: Deep analysis on relevant signals (lookback window is configurable)
  const tier3Cutoff = getAnalysisLookbackCutoff();
  let tier3Query = supabase
    .from('intelligence_signals')
    .select('*')
    .eq('tier1_processed', true)
    .eq('tier3_processed', false)
    .gte('relevance_score', 0.5)
    .order('relevance_score', { ascending: false })
    .limit(batchSize);
  if (tier3Cutoff) {
    tier3Query = tier3Query.gte('discovered_at', tier3Cutoff);
  }
  const { data: relevant } = await tier3Query;

  if (relevant) {
    const tier3Candidates = relevant.filter((signal) => {
      if (!Array.isArray(signal.matched_promise_ids) || signal.matched_promise_ids.length === 0) {
        return false;
      }
      const contentLength = [signal.title || '', signal.content || ''].join('').trim().length;
      if (contentLength < 200) {
        console.log(`[Brain] Skipped Tier 3 for signal ${signal.id}: content too short (${contentLength} chars < 200). Tier 1 classification only.`);
        return false;
      }
      return true;
    });

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

        // Extract progress percentage (regex only, no AI cost)
        const signalText = getSignalText(signal as unknown as Signal);
        const progressExtraction = await extractProgress(
          signal.id,
          signalText,
        );

        const extractedData = primaryAnalysis?.extractedData || {};
        const signalMetadata = (signal.metadata || {}) as Record<string, unknown>;
        signalMetadata.tier3_scanned_at = new Date().toISOString();
        signalMetadata.tier3_scan_version = '2026-03-30';
        const reviewRequired = needsHumanReview({
          confidence,
          relevanceScore: signal.relevance_score as number | null,
          matchedPromiseIds,
        });
        const reviewStatus = nextReviewStatus(
          reviewRequired,
          (signal as Signal).review_status,
        );

        // Merge progress extraction into metadata and extracted_data
        if (progressExtraction) {
          signalMetadata.progress_extraction = progressExtraction;
          (extractedData as Record<string, unknown>).progress = {
            value: progressExtraction.progress,
            confidence: progressExtraction.confidence,
            method: progressExtraction.method,
            evidence: progressExtraction.evidence,
            breakdown: progressExtraction.breakdown || null,
          };
        }

        await supabase
          .from('intelligence_signals')
          .update({
            tier3_processed: true,
            confidence,
            classification: normalizedClass,
            reasoning:
              primaryAnalysis?.reasoning || signal.reasoning,
            extracted_data: extractedData,
            metadata: signalMetadata,
            corroborated_by: corroborating.map((s) => s.id),
            review_required: reviewRequired,
            review_status: reviewStatus,
          })
          .eq('id', signal.id);

        // Create promise updates (only for analyses with sufficient confidence)
        for (const analysis of analyses) {
          if (analysis.confidence < 0.4) {
            console.log(`[Brain] Skipped promise_update for signal ${signal.id} → promise ${analysis.promiseId}: confidence ${analysis.confidence} < 0.4 threshold`);
            continue;
          }

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

function formatEntityContext(entities: ExtractedEntities): string {
  const parts: string[] = [];

  if (entities.people.length > 0) {
    parts.push(`People: ${entities.people.join(', ')}`);
  }
  if (entities.organizations.length > 0) {
    parts.push(`Organizations: ${entities.organizations.join(', ')}`);
  }
  if (entities.amounts.length > 0) {
    parts.push(`Amounts: ${entities.amounts.join(', ')}`);
  }
  if (entities.locations.length > 0) {
    parts.push(`Locations: ${entities.locations.join(', ')}`);
  }
  if (entities.dates.length > 0) {
    parts.push(`Dates: ${entities.dates.join(', ')}`);
  }
  if (entities.percentages.length > 0) {
    parts.push(`Percentages: ${entities.percentages.join(', ')}`);
  }
  if (entities.commitmentKeywords.length > 0) {
    parts.push(`Commitment Keywords: ${entities.commitmentKeywords.join(', ')}`);
  }

  if (parts.length === 0) return '';

  return `\nHere are the entities extracted from this article:\n${parts.join('\n')}\n\nUse these to make a more accurate classification.`;
}

// Generate a concise AI summary for relevant signals (score >= 0.3)
export async function generateSignalSummary(
  signalId: string,
): Promise<string | null> {
  const supabase = getSupabase();

  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('id, title, content, extracted_data, relevance_score')
    .eq('id', signalId)
    .single();

  if (!signal) return null;
  if ((signal.relevance_score || 0) < 0.3) return null;

  const content = (signal.content || signal.title || '').slice(0, 4000);
  const entities = signal.extracted_data as ExtractedEntities | null;

  let entitySection = '';
  if (entities) {
    const parts: string[] = [];
    if (entities.people?.length) parts.push(`People: ${entities.people.join(', ')}`);
    if (entities.organizations?.length) parts.push(`Organizations: ${entities.organizations.join(', ')}`);
    if (entities.amounts?.length) parts.push(`Amounts: ${entities.amounts.join(', ')}`);
    if (entities.locations?.length) parts.push(`Locations: ${entities.locations.join(', ')}`);
    if (entitySection) entitySection = `\n\nExtracted entities:\n${parts.join('\n')}`;
    if (parts.length > 0) entitySection = `\n\nExtracted entities:\n${parts.join('\n')}`;
  }

  const systemPrompt = `You are a concise news analyst for Nepal Republic, a government promise tracker.
Summarize the following article in 2-3 sentences focusing on:
- What happened
- Who is involved
- What government commitment does it relate to
- Any specific numbers or dates

Be factual and brief. Respond with ONLY the summary text, no JSON.`;

  const userPrompt = `Article content:
${content}${entitySection}`;

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    const summary = response.content.trim();

    if (summary.length < 10) return null;

    // Store the summary
    await supabase
      .from('intelligence_signals')
      .update({ content_summary: summary })
      .eq('id', signalId);

    return summary;
  } catch (err) {
    console.warn(
      `[Brain] Failed to generate summary for ${signalId}: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return null;
  }
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
