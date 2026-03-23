/**
 * Social Media Evidence Collector
 *
 * Reads classified intelligence signals from the database and extracts
 * quotes/statements attributed to officials, creating evidence_vault entries.
 * Works with Facebook (Apify), Twitter, and other social signal types.
 */

import { PROMISES_KNOWLEDGE } from '../knowledge-base';

// ----- Types -----

interface SignalRow {
  id: string;
  source_id: string;
  signal_type: string;
  title: string;
  content: string | null;
  url: string;
  author: string | null;
  published_at: string | null;
  relevance_score: number;
  matched_promise_ids: number[] | null;
  classification: string | null;
  metadata: Record<string, unknown> | null;
  language: string | null;
}

interface EvidenceInsert {
  official_name: string;
  official_title: string | null;
  quote_text: string;
  quote_summary: string | null;
  quote_context: string | null;
  language: string;
  source_type: string;
  source_url: string;
  source_title: string | null;
  spoken_date: string | null;
  promise_ids: number[];
  statement_type: string | null;
  verification_status: string;
  signal_id: string;
  sentiment: number | null;
  importance_score: number;
  tags: string[];
}

// ----- Official Name Patterns -----

interface OfficialPattern {
  name: string;
  title: string;
  patterns: RegExp[];
}

const OFFICIAL_PATTERNS: OfficialPattern[] = [
  {
    name: 'Rabi Lamichhane',
    title: 'RSP Chairman / Home Minister',
    patterns: [
      /rabi\s*lamichhane/i,
      /lamichhane/i,
      /रवि\s*लामिछाने/,
      /लामिछाने/,
      /home\s*minister/i,
      /गृहमन्त्री/,
    ],
  },
  {
    name: 'Swarnim Wagle',
    title: 'NPC Vice Chair',
    patterns: [
      /swarnim\s*wagle/i,
      /wagle/i,
      /स्वर्णिम\s*वाग्ले/,
      /वाग्ले/,
    ],
  },
  {
    name: 'Balen Shah',
    title: 'Mayor, Kathmandu Metropolitan City',
    patterns: [
      /balen\s*shah/i,
      /mayor\s*balen/i,
      /बालेन\s*शाह/,
      /बालेन/,
      /महानगरपालिका\s*प्रमुख/,
    ],
  },
  {
    name: 'KP Sharma Oli',
    title: 'Prime Minister',
    patterns: [
      /kp\s*(?:sharma\s*)?oli/i,
      /pm\s*oli/i,
      /prime\s*minister/i,
      /प्रधानमन्त्री/,
      /केपी\s*ओली/,
      /ओली/,
    ],
  },
  {
    name: 'Bishnu Poudel',
    title: 'Finance Minister',
    patterns: [
      /bishnu\s*poudel/i,
      /finance\s*minister/i,
      /अर्थमन्त्री/,
      /विष्णु\s*पौडेल/,
    ],
  },
];

// ----- Helper Functions -----

/**
 * Detect which official is mentioned in text.
 */
function detectOfficial(text: string): OfficialPattern | null {
  for (const official of OFFICIAL_PATTERNS) {
    if (official.patterns.some((p) => p.test(text))) {
      return official;
    }
  }
  return null;
}

/**
 * Map signal source type to evidence source type.
 */
function mapSourceType(
  signalType: string,
  metadata?: Record<string, unknown> | null,
): string {
  const platform = metadata?.platform as string | undefined;

  if (signalType === 'tweet') return 'twitter';
  if (signalType === 'post' && platform === 'facebook') return 'facebook';
  if (signalType === 'post') return 'facebook';
  if (signalType === 'video') return 'youtube';
  if (signalType === 'article') return 'news_interview';
  if (signalType === 'press_release') return 'press_conference';
  if (signalType === 'hansard') return 'parliament';
  if (signalType === 'speech') return 'press_conference';

  return 'official_statement';
}

/**
 * Classify statement type from text content.
 */
function classifyFromText(text: string, classification?: string | null): string | null {
  // Use existing AI classification if available
  if (classification === 'confirms') return 'claim';
  if (classification === 'contradicts') return 'contradiction';
  if (classification === 'budget_allocation') return 'update';
  if (classification === 'policy_change') return 'update';
  if (classification === 'statement') return 'acknowledgment';

  // Fallback: keyword-based classification
  const lower = text.toLowerCase();
  if (/commit|promise|pledge|will\s+do|गर्नेछौं|प्रतिबद्ध/.test(lower)) return 'commitment';
  if (/achieved|completed|done|success|सम्पन्न|पूरा/.test(lower)) return 'claim';
  if (/delay|difficult|challenge|obstacle|कठिन|चुनौती/.test(lower)) return 'excuse';
  if (/progress|underway|ongoing|phase|प्रगति|जारी/.test(lower)) return 'update';
  if (/deny|reject|never|अस्वीकार/.test(lower)) return 'denial';

  return 'acknowledgment';
}

/**
 * Extract a quote from signal content. Tries to find the most relevant
 * sentence or paragraph.
 */
function extractQuote(content: string, maxLength = 500): string {
  if (!content) return '';

  // If content is short enough, use it all
  if (content.length <= maxLength) return content.trim();

  // Try to find sentences with official names or promise-related keywords
  const sentences = content.split(/[.!?\n]+/).filter((s) => s.trim().length > 20);

  const relevant = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return (
      OFFICIAL_PATTERNS.some((o) => o.patterns.some((p) => p.test(s))) ||
      PROMISES_KNOWLEDGE.some((pk) =>
        pk.title.toLowerCase().split(/\s+/).some((w) => w.length > 4 && lower.includes(w)),
      )
    );
  });

  if (relevant.length > 0) {
    return relevant.slice(0, 3).join('. ').slice(0, maxLength).trim();
  }

  // Fallback: first maxLength characters
  return content.slice(0, maxLength).trim();
}

/**
 * Estimate importance based on relevance score and promise match count.
 */
function estimateImportance(
  relevanceScore: number,
  promiseIds: number[],
  hasOfficial: boolean,
): number {
  let score = relevanceScore * 0.5;
  score += Math.min(promiseIds.length * 0.1, 0.3);
  if (hasOfficial) score += 0.2;
  return Math.min(1, Math.max(0, score));
}

// ----- Main Collector -----

export interface CollectorResult {
  signalsProcessed: number;
  evidenceCreated: number;
  errors: string[];
}

/**
 * Collect evidence from classified intelligence signals.
 *
 * 1. Queries intelligence_signals with relevance_score > 0.5
 * 2. Extracts quotes attributed to officials
 * 3. Maps to promises
 * 4. Creates evidence_vault entries
 */
export async function collectSocialEvidence(options?: {
  minRelevance?: number;
  limit?: number;
  signalTypes?: string[];
}): Promise<CollectorResult> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();

  const minRelevance = options?.minRelevance ?? 0.5;
  const limit = options?.limit ?? 50;
  const signalTypes = options?.signalTypes ?? ['tweet', 'post', 'video', 'article', 'press_release', 'hansard', 'speech'];

  const errors: string[] = [];
  let signalsProcessed = 0;
  let evidenceCreated = 0;

  try {
    // 1. Get relevant, unprocessed signals
    const { data: signals, error: queryError } = await supabase
      .from('intelligence_signals')
      .select(
        'id, source_id, signal_type, title, content, url, author, published_at, relevance_score, matched_promise_ids, classification, metadata, language',
      )
      .gte('relevance_score', minRelevance)
      .in('signal_type', signalTypes)
      .eq('tier1_processed', true)
      .order('relevance_score', { ascending: false })
      .limit(limit);

    if (queryError) {
      errors.push(`Query error: ${queryError.message}`);
      return { signalsProcessed: 0, evidenceCreated: 0, errors };
    }

    if (!signals || signals.length === 0) {
      return { signalsProcessed: 0, evidenceCreated: 0, errors };
    }

    // 2. Check which signals already have evidence entries
    const signalIds = signals.map((s: SignalRow) => s.id);
    const { data: existingEvidence } = await supabase
      .from('evidence_vault')
      .select('signal_id')
      .in('signal_id', signalIds);

    const existingSignalIds = new Set(
      (existingEvidence || []).map((e: { signal_id: string }) => e.signal_id),
    );

    // 3. Process each signal
    for (const signal of signals as SignalRow[]) {
      signalsProcessed++;

      // Skip if evidence already exists for this signal
      if (existingSignalIds.has(signal.id)) continue;

      const fullText = [signal.title, signal.content].filter(Boolean).join(' ');
      if (!fullText || fullText.length < 20) continue;

      // Detect official
      const official = detectOfficial(fullText);

      // Get promise IDs (from AI classification or signal metadata)
      let promiseIds = signal.matched_promise_ids || [];
      if (promiseIds.length === 0) {
        // Try keyword matching
        promiseIds = findPromiseMatches(fullText);
      }

      // Only create evidence if there is some substance
      if (promiseIds.length === 0 && !official) continue;

      const quote = extractQuote(signal.content || signal.title, 500);
      if (!quote) continue;

      const sourceType = mapSourceType(signal.signal_type, signal.metadata);
      const statementType = classifyFromText(fullText, signal.classification);

      const entry: EvidenceInsert = {
        official_name: official?.name || signal.author || 'Unknown',
        official_title: official?.title || null,
        quote_text: quote,
        quote_summary: null,
        quote_context: signal.title,
        language: signal.language || 'en',
        source_type: sourceType,
        source_url: signal.url,
        source_title: signal.title,
        spoken_date: signal.published_at,
        promise_ids: promiseIds,
        statement_type: statementType,
        verification_status: 'unverified',
        signal_id: signal.id,
        sentiment: null,
        importance_score: estimateImportance(
          signal.relevance_score,
          promiseIds,
          !!official,
        ),
        tags: [
          'auto-collected',
          signal.signal_type,
          ...(official ? [official.name.toLowerCase().replace(/\s+/g, '-')] : []),
        ],
      };

      const { error: insertError } = await supabase
        .from('evidence_vault')
        .insert(entry);

      if (insertError) {
        errors.push(
          `Insert error for signal ${signal.id}: ${insertError.message}`,
        );
      } else {
        evidenceCreated++;
      }
    }
  } catch (err) {
    errors.push(
      `Collection error: ${err instanceof Error ? err.message : 'unknown'}`,
    );
  }

  return { signalsProcessed, evidenceCreated, errors };
}

/**
 * Keyword-based promise matching as fallback when AI classification is not available.
 */
function findPromiseMatches(text: string): number[] {
  const lower = text.toLowerCase();
  const matches: { id: number; score: number }[] = [];

  for (const promise of PROMISES_KNOWLEDGE) {
    let score = 0;
    const titleWords = promise.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const aspectWords = promise.keyAspects
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((w) => w.length > 4);

    for (const w of titleWords) {
      if (lower.includes(w)) score += 2;
    }
    for (const w of aspectWords) {
      if (lower.includes(w)) score += 1;
    }
    // Check Nepali title
    if (lower.includes(promise.titleNe)) score += 3;

    if (score >= 3) {
      matches.push({ id: promise.id, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5).map((m) => m.id);
}
