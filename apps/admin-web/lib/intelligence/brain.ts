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
import { PROMISES_KNOWLEDGE } from './knowledge-base';
import {
  type Classification,
  normalizeClassification,
  needsHumanReview,
} from './types';

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

// TIER 1: Quick classification (uses cheap/free model)
export async function tier1Classify(
  signal: Signal,
): Promise<ClassificationResult> {
  const systemPrompt = `You are an intelligence analyst for Nepal Najar, a government promise tracker.
You analyze signals (news articles, social media posts, videos, documents) to determine if they are relevant to any of Nepal's 109 government promises.

Here are the 109 promises (ID: Title — Key aspects):
${PROMISES_KNOWLEDGE.map((p) => `${p.id}: ${p.title} — ${p.keyAspects}`).join('\n')}

NEPALI CONTENT HANDLING:
- Many signals will be in Nepali (Devanagari script). You MUST read and understand Nepali text.
- Match Nepali keywords to English promise titles and vice versa.
- Consider that the same concept may be expressed differently in Nepali vs English.
- "अर्ब" = billion NPR, "करोड" = 10 million NPR, "लाख" = 100,000 NPR.
- Dates may be in Bikram Sambat (BS) calendar — note the BS date and approximate AD equivalent in your reasoning.
- Government ministry names appear in both languages — match them correctly.

CURRENT POLITICAL CONTEXT (as of March 2026):
- Nepal held snap elections on March 5, 2026. RSP (Rastriya Swatantra Party) won 182/275 seats.
- Balen Shah is the new Prime Minister (sworn in March 26, 2026).
- Rabi Lamichhane is RSP Chairman. These are RSP's "बाचा पत्र 2082" campaign promises being tracked.
- The previous KP Sharma Oli government was replaced after Gen Z protests in September 2025.

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

    return {
      ...parsed,
      classification: normalizeClassification(parsed.classification),
      relevanceScore:
        typeof parsed.relevanceScore === 'number' ? parsed.relevanceScore : 0,
      matchedPromiseIds: Array.isArray(parsed.matchedPromiseIds)
        ? parsed.matchedPromiseIds
        : [],
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
  const systemPrompt = `You are a senior intelligence analyst for Nepal Najar, a government promise tracker for Nepal.

Your job is to deeply analyze evidence and determine its impact on specific government promises. You must:
1. Understand the INTENT behind each promise, not just keywords
2. Extract specific data: budget amounts (NPR), dates, percentages, official names
3. Detect indirect evidence (e.g., "Ministry allocated NPR 5B for roads" -> Promise #15 highway is progressing)
4. Identify contradictions (e.g., official says "on track" but budget was cut)
5. Consider the source reliability and cross-reference with other signals
6. Suggest status changes with reasoning

Here are the full promise details:
${PROMISES_KNOWLEDGE.map(
  (p) => `
Promise #${p.id}: ${p.title}
Category: ${p.category}
Description: ${p.description}
Key indicators of progress: ${p.progressIndicators}
Key indicators of stalling: ${p.stallIndicators}
Current status: ${p.currentStatus || 'unknown'}
`,
).join('\n---\n')}

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

CURRENT POLITICAL CONTEXT (as of March 2026):
- Nepal held snap elections on March 5, 2026. RSP (Rastriya Swatantra Party) won 182/275 seats.
- Balen Shah is the new Prime Minister (sworn in March 26, 2026).
- Rabi Lamichhane is RSP Chairman. These are RSP's "बाचा पत्र 2082" campaign promises being tracked.
- The previous KP Sharma Oli government was replaced after Gen Z protests in September 2025.

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

      await new Promise((r) => setTimeout(r, 500));
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
    for (const signal of relevant) {
      try {
        // Find corroborating signals
        const corroborating = await findCorroboratingSignals(
          signal as unknown as Signal,
          (signal.matched_promise_ids as number[]) || [],
        );

        const analyses = await tier3Analyze(
          signal as unknown as Signal,
          corroborating,
        );

        // Update signal with deep analysis
        const primaryAnalysis = analyses[0];
        const normalizedClass = normalizeClassification(
          primaryAnalysis?.classification || signal.classification,
        );
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
              matchedPromiseIds: (signal.matched_promise_ids as number[]) || [],
            }),
          })
          .eq('id', signal.id);

        // Create promise updates
        for (const analysis of analyses) {
          if (analysis.confidence >= 0.3) {
            await supabase.from('promise_updates').insert({
              promise_id: analysis.promiseId,
              article_id: signal.url,
              field_changed: analysis.classification,
              new_value: JSON.stringify({
                confidence: analysis.confidence,
                suggestedStatus: analysis.suggestedStatus,
                suggestedProgress: analysis.suggestedProgress,
                extractedData: analysis.extractedData,
              }),
              change_reason: analysis.reasoning,
            });

            promisesUpdated++;
          }
        }

        tier3Processed++;
      } catch (err) {
        errors.push(
          `Tier3 ${signal.id}: ${err instanceof Error ? err.message : 'error'}`,
        );
      }

      await new Promise((r) => setTimeout(r, 1000));
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
