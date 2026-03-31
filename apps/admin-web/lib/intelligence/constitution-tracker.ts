/**
 * Constitution Amendment Tracker
 *
 * Watches intelligence signals for constitutional amendment activity.
 * Detects proposed/passed amendments, extracts which articles are affected,
 * and updates the constitution_articles table.
 *
 * Runs as part of the sweep pipeline.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ── Types ────────────────────────────────────────────────────────────────────

interface SignalRow {
  id: string;
  title: string;
  content: string | null;
  content_summary: string | null;
  source_id: string;
  discovered_at: string;
  published_at: string | null;
}

interface AIAmendmentResult {
  amendments: {
    articleNumbers: number[];
    description: string;
    status: 'proposed' | 'passed' | 'rejected' | 'under_discussion';
    proposedBy: string | null;
    date: string | null;
  }[];
}

// ── Patterns ─────────────────────────────────────────────────────────────────

const AMENDMENT_PATTERNS_EN = [
  'constitutional amendment',
  'amend the constitution',
  'amending article',
  'constitution bill',
  'constitution draft',
  'two-thirds majority',
  'sambhidhan samsodhan',
  'federal restructuring',
  'directly elected',
  'executive president',
  'constitutional provision',
  'repeal article',
  'insert article',
  'substitute article',
];

const AMENDMENT_PATTERNS_NE = [
  'संविधान संशोधन',
  'संशोधन विधेयक',
  'संविधान परिवर्तन',
  'दुई तिहाई',
  'संवैधानिक प्रावधान',
  'धारा संशोधन',
  'संविधान सभा',
  'संघीय पुनर्संरचना',
  'प्रत्यक्ष निर्वाचित',
  'कार्यकारी राष्ट्रपति',
];

// ── Cheap pattern filter ─────────────────────────────────────────────────────

function isAmendmentSignal(signal: SignalRow): boolean {
  const text = `${signal.title} ${signal.content || ''} ${signal.content_summary || ''}`.toLowerCase();
  return (
    AMENDMENT_PATTERNS_EN.some((p) => text.includes(p)) ||
    AMENDMENT_PATTERNS_NE.some((p) => text.includes(p))
  );
}

// ── AI extraction ────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert on Nepal's 2015 Constitution (संविधान २०७२). Extract constitutional amendment information from the given text.

Return ONLY valid JSON (no markdown). Format:
{
  "amendments": [
    {
      "articleNumbers": [74, 75, 76],
      "description": "Brief description of the proposed change",
      "status": "proposed | passed | rejected | under_discussion",
      "proposedBy": "Who proposed it (person or party)",
      "date": "YYYY-MM-DD or null"
    }
  ]
}

Rules:
- Only extract REAL amendment proposals or changes, not general political commentary
- Map to specific article numbers when mentioned (Nepal's constitution has 308 articles)
- Key article areas: Part 7 (Articles 74-82) = Federal Executive, Part 3 (Articles 16-48) = Fundamental Rights
- Article 274 = Constitutional Amendment procedure
- If specific articles aren't mentioned but the topic is clear, estimate the relevant articles
- If no amendments found, return {"amendments": []}`;

async function extractAmendmentsFromSignal(
  signal: SignalRow,
): Promise<AIAmendmentResult['amendments']> {
  const text = `${signal.title}\n\n${signal.content || signal.content_summary || ''}`.slice(0, 3000);

  try {
    const response = await aiComplete(
      'extract',
      EXTRACTION_PROMPT,
      `Extract constitutional amendment information (published ${signal.published_at || signal.discovered_at}):\n\n${text}`,
    );

    const jsonMatch = response.content.match(/\{[\s\S]*"amendments"[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as AIAmendmentResult;
    return parsed.amendments || [];
  } catch (err) {
    console.warn(
      `[ConstitutionTracker] Failed to extract from signal ${signal.id}:`,
      err instanceof Error ? err.message : 'unknown',
    );
    return [];
  }
}

// ── Main pipeline ────────────────────────────────────────────────────────────

export interface ConstitutionTrackingResult {
  signalsScanned: number;
  amendmentSignals: number;
  amendmentsDetected: number;
  articlesUpdated: number;
  errors: string[];
}

/**
 * Scan recent signals for constitutional amendment activity.
 * Called from sweep pipeline.
 */
export async function trackConstitutionAmendments(
  sinceIso?: string,
): Promise<ConstitutionTrackingResult> {
  const supabase = getSupabase();
  const result: ConstitutionTrackingResult = {
    signalsScanned: 0,
    amendmentSignals: 0,
    amendmentsDetected: 0,
    articlesUpdated: 0,
    errors: [],
  };

  // Fetch recent signals
  let query = supabase
    .from('intelligence_signals')
    .select('id, title, content, content_summary, source_id, discovered_at, published_at')
    .order('discovered_at', { ascending: false })
    .limit(500);

  if (sinceIso) {
    query = query.gte('discovered_at', sinceIso);
  } else {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('discovered_at', weekAgo);
  }

  const { data: signals, error } = await query;
  if (error) {
    result.errors.push(`Failed to fetch signals: ${error.message}`);
    return result;
  }

  result.signalsScanned = (signals || []).length;

  // Filter for amendment-related signals
  const amendmentSignals = (signals || []).filter(isAmendmentSignal);
  result.amendmentSignals = amendmentSignals.length;

  if (amendmentSignals.length === 0) {
    console.log('[ConstitutionTracker] No amendment signals found');
    return result;
  }

  console.log(
    `[ConstitutionTracker] Found ${amendmentSignals.length} amendment signals out of ${result.signalsScanned}`,
  );

  // Extract amendments via AI
  for (const signal of amendmentSignals) {
    try {
      const amendments = await extractAmendmentsFromSignal(signal as SignalRow);
      result.amendmentsDetected += amendments.length;

      for (const amendment of amendments) {
        for (const articleNum of amendment.articleNumbers) {
          // Update the article's amendment status
          const { error: updateError } = await supabase
            .from('constitution_articles')
            .update({
              is_amended: amendment.status === 'passed',
              amendment_date: amendment.date,
              amendment_note: amendment.description,
              amendment_status: amendment.status === 'passed' ? 'current' : amendment.status,
              updated_at: new Date().toISOString(),
            })
            .eq('article_number', articleNum)
            .eq('amendment_status', 'current');

          if (!updateError) {
            result.articlesUpdated++;
          }
        }
      }

      // Rate limit between AI calls
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      result.errors.push(
        `Signal ${signal.id}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  console.log(
    `[ConstitutionTracker] Detected ${result.amendmentsDetected} amendments, updated ${result.articlesUpdated} articles`,
  );

  return result;
}
