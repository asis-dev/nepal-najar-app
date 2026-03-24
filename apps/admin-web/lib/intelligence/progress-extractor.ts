/**
 * Progress Extractor
 *
 * Extracts concrete progress percentages from signal content using regex only.
 * No AI calls — designed to be fast and cheap for every signal.
 *
 * Three extraction methods (tried in order):
 * 1. Direct Statement — article explicitly states a percentage
 * 2. Calculated — derives percentage from completed/total numbers
 * 3. Milestone-Based — maps known project milestones to estimated percentages
 */

import { getSupabase } from '@/lib/supabase/server';
import { type ExtractedEntities } from './entity-extractor';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProgressExtraction {
  progress: number;              // 0-100
  confidence: number;            // 0-1
  method: 'direct' | 'calculated' | 'milestone';
  evidence: string;              // the text that led to this extraction
  breakdown?: {
    completed?: number;          // e.g., 42 schools
    total?: number;              // e.g., 100 schools
    unit?: string;               // e.g., "schools", "km", "health posts"
  };
}

export interface CommitmentProgressResult {
  progress: number;
  confidence: number;
  sources: ProgressExtraction[];
  method: string;
}

// ── Method 1: Direct Statement Patterns ──────────────────────────────────────

const DIRECT_PATTERNS: RegExp[] = [
  // "45% complete", "45% done", "45% finished", "४५ प्रतिशत सम्पन्न"
  /(\d+(?:\.\d+)?)\s*(%|percent|प्रतिशत)\s*(?:complete|done|finished|सम्पन्न|पूरा)/gi,
  // "progress is 45%", "completion at 45%", "काम 45%"
  /(?:progress|completion|काम)\s*(?:is|at|of)?\s*(\d+(?:\.\d+)?)\s*(%|percent)/gi,
  // "45% progress", "45% complete", "४५ प्रतिशत भएको"
  /(\d+(?:\.\d+)?)\s*(%|percent|प्रतिशत)\s*(?:progress|complete|भएको)/gi,
  // "completed 45%", "achieved 45 percent"
  /(?:completed|achieved|reached|accomplished)\s*(\d+(?:\.\d+)?)\s*(%|percent|प्रतिशत)/gi,
  // "45 percent completion"
  /(\d+(?:\.\d+)?)\s*(?:percent|%|प्रतिशत)\s*(?:completion|accomplishment)/gi,
];

// ── Method 2: Calculated from Numbers Patterns ───────────────────────────────

const CALCULATED_PATTERNS: {
  pattern: RegExp;
  completedGroup: number;
  totalGroup: number;
  unitGroup?: number;
}[] = [
  // "42 of 100 schools completed", "42 out of 100 built", "42 मध्ये 100 बनेको"
  {
    pattern: /(\d+)\s*(?:of|out of|मध्ये)\s*(\d+)\s*([\w\s]+?)?\s*(?:completed|built|done|opened|constructed|बनेको|सम्पन्न)/gi,
    completedGroup: 1,
    totalGroup: 2,
    unitGroup: 3,
  },
  // "42 completed ... 100 total"
  {
    pattern: /(\d+)\s*(?:completed|built|opened|constructed|बनेको|सम्पन्न)\s*[\s\S]{0,60}?(\d+)\s*(?:total|planned|target|लक्ष्य)/gi,
    completedGroup: 1,
    totalGroup: 2,
  },
  // "42 km completed ... 100 km total"
  {
    pattern: /(\d+)\s*(km|kilometers|किलोमिटर|schools|विद्यालय|hospitals|अस्पताल|health posts|स्वास्थ्य चौकी|bridges|पुल|houses|घर|megawatt|MW|मेगावाट)\s*(?:completed|built|done|constructed|बनेको|सम्पन्न)\s*[\s\S]{0,80}?(\d+)\s*(?:\2|total|planned|target|लक्ष्य)/gi,
    completedGroup: 1,
    totalGroup: 3,
    unitGroup: 2,
  },
  // "built 42 of 100 bridges"
  {
    pattern: /(?:built|completed|constructed|opened|बनेको|सम्पन्न)\s*(\d+)\s*(?:of|out of|मध्ये)\s*(\d+)\s*([\w\s]+)/gi,
    completedGroup: 1,
    totalGroup: 2,
    unitGroup: 3,
  },
];

// ── Method 3: Milestone Map ──────────────────────────────────────────────────

const MILESTONE_MAP: { pattern: RegExp; progress: number }[] = [
  // Legislative process
  { pattern: /\b(?:announced|घोषणा)\b/i, progress: 5 },
  { pattern: /\b(?:committee formed|समिति गठन)\b/i, progress: 10 },
  { pattern: /\b(?:study completed|अध्ययन)\b/i, progress: 15 },
  { pattern: /\b(?:draft prepared|मस्यौदा)\b/i, progress: 20 },
  { pattern: /\b(?:bill introduced|bill tabled|विधेयक दर्ता)\b/i, progress: 30 },
  { pattern: /\b(?:committee review|समिति समीक्षा)\b/i, progress: 40 },
  { pattern: /(?:passed by committee|समितिबाट पारित)/i, progress: 50 },
  { pattern: /(?:parliamentary debate|संसदीय छलफल)/i, progress: 60 },
  { pattern: /(?:passed by parliament|संसदले पारित)/i, progress: 80 },
  { pattern: /\b(?:enacted|signed into law|कानून बनेको)\b/i, progress: 95 },
  { pattern: /\b(?:implemented|कार्यान्वयन)\b/i, progress: 100 },

  // Infrastructure
  { pattern: /\b(?:feasibility study|सम्भाव्यता)\b/i, progress: 10 },
  { pattern: /\b(?:tender issued|बोलपत्र)\b/i, progress: 15 },
  { pattern: /\b(?:contract awarded|ठेक्का)\b/i, progress: 20 },
  { pattern: /(?:construction started|निर्माण शुरु)/i, progress: 25 },
  { pattern: /(?:foundation laid|शिलान्यास)/i, progress: 25 },
  { pattern: /(?:under construction|निर्माणाधीन)/i, progress: 40 },
  { pattern: /\b(?:testing|परीक्षण)\b/i, progress: 85 },
  { pattern: /\b(?:inaugurated|उद्घाटन)\b/i, progress: 95 },
  { pattern: /\b(?:operational|सञ्चालन)\b/i, progress: 100 },

  // Policy/Program
  { pattern: /(?:policy drafted|नीति मस्यौदा)/i, progress: 15 },
  { pattern: /(?:policy approved|नीति स्वीकृत)/i, progress: 30 },
  { pattern: /(?:guidelines issued|निर्देशिका)/i, progress: 40 },
  { pattern: /(?:pilot launched|प्रायोगिक)/i, progress: 50 },
  { pattern: /(?:rolled out|nationwide|राष्ट्रव्यापी)/i, progress: 70 },
  { pattern: /(?:fully operational|पूर्ण सञ्चालन)/i, progress: 100 },

  // Budget
  { pattern: /(?:budget proposed|बजेट प्रस्ताव)/i, progress: 15 },
  { pattern: /(?:budget allocated|बजेट विनियोजन)/i, progress: 25 },
  { pattern: /(?:budget disbursed|बजेट खर्च)/i, progress: 40 },
  { pattern: /(?:budget utilized|बजेट उपयोग)/i, progress: 60 },
];

// Official source indicators for higher confidence on direct extractions
const OFFICIAL_SOURCE_PATTERNS = [
  /government/i,
  /ministry/i,
  /official/i,
  /minister/i,
  /सरकार/,
  /मन्त्रालय/,
  /मन्त्री/,
  /NPC/,
  /parliament/i,
  /संसद/,
];

// ── Extraction Methods ───────────────────────────────────────────────────────

function isOfficialSource(content: string): boolean {
  return OFFICIAL_SOURCE_PATTERNS.some((p) => p.test(content));
}

function extractDirect(content: string): ProgressExtraction | null {
  for (const pattern of DIRECT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      // Find the captured digit group — it's always the first numeric capture
      let value: number | null = null;
      for (let i = 1; i < match.length; i++) {
        const num = parseFloat(match[i]);
        if (Number.isFinite(num) && num >= 0 && num <= 100) {
          value = num;
          break;
        }
      }

      if (value === null) continue;

      // Clamp to 0-100
      const progress = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
      const confidence = isOfficialSource(content) ? 0.9 : 0.7;

      return {
        progress,
        confidence,
        method: 'direct',
        evidence: match[0].trim(),
      };
    }
  }
  return null;
}

function extractCalculated(content: string): ProgressExtraction | null {
  for (const { pattern, completedGroup, totalGroup, unitGroup } of CALCULATED_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      const completed = parseInt(match[completedGroup], 10);
      const total = parseInt(match[totalGroup], 10);

      // Sanity checks
      if (
        !Number.isFinite(completed) ||
        !Number.isFinite(total) ||
        total <= 0 ||
        completed < 0 ||
        completed > total * 2 // allow slight overcounting but not absurd
      ) {
        continue;
      }

      const progress = Math.max(0, Math.min(100, Math.round((completed / total) * 1000) / 10));
      const unit = unitGroup && match[unitGroup]
        ? match[unitGroup].trim().toLowerCase()
        : undefined;

      return {
        progress,
        confidence: 0.85,
        method: 'calculated',
        evidence: match[0].trim(),
        breakdown: {
          completed,
          total,
          unit: unit || undefined,
        },
      };
    }
  }
  return null;
}

function extractMilestone(content: string): ProgressExtraction | null {
  let highestProgress = -1;
  let bestEvidence = '';

  for (const { pattern, progress } of MILESTONE_MAP) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match && progress > highestProgress) {
      highestProgress = progress;
      bestEvidence = match[0].trim();
    }
  }

  if (highestProgress < 0) return null;

  return {
    progress: highestProgress,
    confidence: 0.5,
    method: 'milestone',
    evidence: bestEvidence,
  };
}

// ── Main Extraction Function ─────────────────────────────────────────────────

export async function extractProgress(
  signalId: string,
  content: string,
  existingEntities?: ExtractedEntities,
): Promise<ProgressExtraction | null> {
  if (!content || content.trim().length === 0) return null;

  // Method 1: Direct percentage statement (highest confidence)
  const direct = extractDirect(content);
  if (direct) return direct;

  // Method 2: Calculated from numbers
  const calculated = extractCalculated(content);
  if (calculated) return calculated;

  // Method 3: Milestone-based (lowest confidence)
  const milestone = extractMilestone(content);
  if (milestone) return milestone;

  return null;
}

// ── Aggregate Progress for a Commitment ──────────────────────────────────────

export async function computeCommitmentProgress(
  promiseId: number,
): Promise<CommitmentProgressResult | null> {
  const supabase = getSupabase();

  // Fetch all tier3-processed signals matched to this commitment
  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select('id, title, content, metadata, confidence, relevance_score, review_status')
    .contains('matched_promise_ids', [promiseId])
    .eq('tier3_processed', true)
    .gte('relevance_score', 0.3)
    .neq('review_status', 'rejected')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(
      `[ProgressExtractor] Error fetching signals for promise ${promiseId}:`,
      error.message,
    );
    return null;
  }

  if (!signals || signals.length === 0) return null;

  const extractions: ProgressExtraction[] = [];

  for (const signal of signals) {
    const text = [signal.title ?? '', signal.content ?? ''].join(' ').trim();
    if (!text) continue;

    // Check if we already have a cached extraction in metadata
    const metadata = (signal.metadata || {}) as Record<string, unknown>;
    const cached = metadata.progress_extraction as ProgressExtraction | undefined;

    if (cached && typeof cached.progress === 'number') {
      extractions.push(cached);
      continue;
    }

    // Extract fresh
    const extraction = await extractProgress(signal.id, text);
    if (extraction) {
      extractions.push(extraction);
    }
  }

  if (extractions.length === 0) return null;

  // Weighted average by confidence
  let weightedSum = 0;
  let weightTotal = 0;

  for (const ext of extractions) {
    weightedSum += ext.progress * ext.confidence;
    weightTotal += ext.confidence;
  }

  const progress = weightTotal > 0
    ? Math.round((weightedSum / weightTotal) * 10) / 10
    : 0;

  // Determine overall confidence
  let confidence = weightTotal > 0
    ? weightTotal / extractions.length
    : 0;

  // Boost confidence if multiple methods agree (within 10 percentage points)
  const methods = new Set(extractions.map((e) => e.method));
  if (methods.size > 1) {
    const progressValues = extractions.map((e) => e.progress);
    const maxDiff = Math.max(...progressValues) - Math.min(...progressValues);
    if (maxDiff <= 10) {
      // Methods agree — boost confidence
      confidence = Math.min(1, confidence + 0.15);
    } else if (maxDiff > 30) {
      // Methods disagree significantly — flag for review by lowering confidence
      confidence = Math.max(0.2, confidence - 0.2);
    }
  }

  // Determine the primary method label
  const methodCounts = { direct: 0, calculated: 0, milestone: 0 };
  for (const ext of extractions) {
    methodCounts[ext.method]++;
  }
  const method = methodCounts.direct > 0
    ? 'direct'
    : methodCounts.calculated > 0
      ? 'calculated'
      : 'milestone';

  return {
    progress: Math.max(0, Math.min(100, progress)),
    confidence: Math.round(confidence * 100) / 100,
    sources: extractions,
    method,
  };
}
