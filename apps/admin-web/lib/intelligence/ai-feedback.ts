/**
 * AI Feedback Loop
 *
 * Queries past human corrections from the ai_corrections table and formats
 * them as context for AI prompts. This allows the classification and analysis
 * models to learn from past mistakes without retraining.
 *
 * Usage: call getRelevantCorrections() before an AI prompt and append the
 * returned string to the system or user prompt.
 */

import { getSupabase } from '@/lib/supabase/server';

const MAX_CORRECTIONS_PER_PROMPT = 5;

interface CorrectionRow {
  id: string;
  correction_type: string;
  signal_id: string | null;
  commitment_id: number | null;
  note: string;
  action_taken: string | null;
  original_values: Record<string, unknown> | null;
  corrected_values: Record<string, unknown> | null;
  created_at: string;
}

interface FeedbackContext {
  signalContent?: string;
  commitmentId?: number;
  category?: string;
}

/**
 * Get relevant past corrections formatted as a prompt appendix.
 *
 * Matching strategy (executed in priority order, de-duped):
 * 1. Commitment-specific — corrections for the same commitment_id
 * 2. Category-wide — corrections whose note mentions the same category
 * 3. Content-similar — corrections whose note shares keywords with signal content
 *
 * Returns an empty string if no relevant corrections are found.
 */
export async function getRelevantCorrections(
  context: FeedbackContext,
): Promise<string> {
  const supabase = getSupabase();

  const seen = new Set<string>();
  const collected: CorrectionRow[] = [];

  // 1. Commitment-specific corrections
  if (context.commitmentId) {
    const { data } = await supabase
      .from('ai_corrections')
      .select('*')
      .eq('commitment_id', context.commitmentId)
      .order('created_at', { ascending: false })
      .limit(MAX_CORRECTIONS_PER_PROMPT);

    for (const row of (data || []) as CorrectionRow[]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        collected.push(row);
      }
    }
  }

  // 2. Category-wide corrections (search note text for category keyword)
  if (context.category && collected.length < MAX_CORRECTIONS_PER_PROMPT) {
    const { data } = await supabase
      .from('ai_corrections')
      .select('*')
      .ilike('note', `%${context.category}%`)
      .order('created_at', { ascending: false })
      .limit(MAX_CORRECTIONS_PER_PROMPT);

    for (const row of (data || []) as CorrectionRow[]) {
      if (!seen.has(row.id) && collected.length < MAX_CORRECTIONS_PER_PROMPT) {
        seen.add(row.id);
        collected.push(row);
      }
    }
  }

  // 3. Content-similar corrections (keyword overlap)
  if (context.signalContent && collected.length < MAX_CORRECTIONS_PER_PROMPT) {
    const keywords = extractKeywords(context.signalContent);
    if (keywords.length > 0) {
      // Search for corrections whose note contains any of the top keywords
      const topKeywords = keywords.slice(0, 3);
      for (const keyword of topKeywords) {
        if (collected.length >= MAX_CORRECTIONS_PER_PROMPT) break;

        const { data } = await supabase
          .from('ai_corrections')
          .select('*')
          .ilike('note', `%${keyword}%`)
          .order('created_at', { ascending: false })
          .limit(3);

        for (const row of (data || []) as CorrectionRow[]) {
          if (!seen.has(row.id) && collected.length < MAX_CORRECTIONS_PER_PROMPT) {
            seen.add(row.id);
            collected.push(row);
          }
        }
      }
    }
  }

  if (collected.length === 0) return '';

  // Format corrections into a prompt-friendly string
  const lines = collected.slice(0, MAX_CORRECTIONS_PER_PROMPT).map(formatCorrection);

  return `PAST CORRECTIONS (learn from these):\n${lines.join('\n')}`;
}

/**
 * Format a single correction row into a human-readable prompt line.
 */
function formatCorrection(row: CorrectionRow): string {
  const parts: string[] = [];

  // Describe what happened
  const typeLabel = CORRECTION_TYPE_LABELS[row.correction_type] || row.correction_type;
  parts.push(`- [${typeLabel}]`);

  if (row.original_values?.classification) {
    parts.push(
      `Signal was classified as "${row.original_values.classification}"`,
    );
  }

  if (row.commitment_id) {
    parts.push(`for commitment #${row.commitment_id}`);
  }

  if (row.action_taken) {
    parts.push(`→ Action: ${row.action_taken}.`);
  }

  // The admin's note is the most valuable learning signal
  parts.push(`\n  Admin note: "${row.note}"`);

  return parts.join(' ');
}

const CORRECTION_TYPE_LABELS: Record<string, string> = {
  merge: 'Merge',
  reclassify: 'Reclassify',
  wrong_commitment: 'Wrong Commitment',
  not_a_commitment: 'Not a Commitment',
  wrong_ministry: 'Wrong Ministry',
  wrong_progress: 'Wrong Progress',
  custom: 'Custom',
};

/**
 * Extract meaningful keywords from signal content for fuzzy matching.
 * Filters out common stop words and very short tokens.
 */
function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if',
    'while', 'about', 'up', 'out', 'this', 'that', 'these', 'those', 'it',
    'its', 'he', 'she', 'they', 'them', 'his', 'her', 'their', 'what',
    'which', 'who', 'whom', 'said', 'also', 'nepal', 'government',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  // Count frequency and return top keywords
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 10);
}
