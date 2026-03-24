/**
 * Truth Meter — Signal Verification Scoring Engine
 *
 * Scores how trustworthy/verified a news story or signal is, based on:
 *   1. Source Credibility (0-25)
 *   2. Cross-Verification (0-25)
 *   3. Evidence Quality (0-25)
 *   4. Community Verification (0-25)
 *
 * Total score: 0-100 (0 = unverified, 100 = confirmed fact)
 */

import { getSupabase } from '@/lib/supabase/server';
import { computeSimilarity } from './dedup';
import { extractEntities } from './entity-extractor';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TruthScore {
  score: number; // 0-100
  label: 'unverified' | 'low' | 'moderate' | 'high' | 'verified';
  factors: {
    sourceCredibility: number; // 0-25
    crossVerification: number; // 0-25
    evidenceQuality: number; // 0-25
    communityVerification: number; // 0-25
  };
  reasoning: string;
  sources: string[];
}

// ── Source credibility map ────────────────────────────────────────────────────

const SOURCE_CREDIBILITY: Record<string, number> = {
  // Government / official documents
  gov_portal: 25,
  government: 25,
  gazette: 25,
  official: 25,

  // Parliament
  parliament: 23,
  parliament_scraper: 23,

  // Major established news outlets
  kathmandupost: 20,
  'kathmandu-post': 20,
  republica: 20,
  'himalayan-times': 20,
  himalayantimes: 20,
  kantipur: 20,
  'kantipur-daily': 20,
  ekantipur: 20,
  'the-kathmandu-post': 20,
  'the-himalayan-times': 20,
  'nepali-times': 20,
  'nagarik-news': 20,
  'gorkhapatra-daily': 20,
  gorkhapatra: 20,
  annapurna_post: 20,
  'annapurna-post': 20,
  'online-khabar': 20,
  onlinekhabar: 20,
  ratopati: 20,
  setopati: 20,

  // Other news
  rss: 15,
  article: 15,
  news: 15,
  'web-search': 15,
  search: 15,

  // YouTube news channels
  youtube: 12,
  youtube_caption: 12,
  youtube_transcript: 12,

  // Reddit / social with evidence
  reddit: 10,
  reddit_scraper: 10,

  // Social media
  facebook: 5,
  facebook_scraper: 5,
  twitter: 5,
  x_scraper: 5,
  threads: 5,
  threads_scraper: 5,
  tiktok: 5,
  tiktok_scraper: 5,
  telegram: 5,
  telegram_scraper: 5,
  social: 5,

  // Unknown / blog
  blog: 3,
  unknown: 3,
};

const DEFAULT_CREDIBILITY = 5;

// ── Label thresholds ─────────────────────────────────────────────────────────

function getLabel(score: number): TruthScore['label'] {
  if (score >= 81) return 'verified';
  if (score >= 61) return 'high';
  if (score >= 41) return 'moderate';
  if (score >= 21) return 'low';
  return 'unverified';
}

// ── Factor 1: Source Credibility ─────────────────────────────────────────────

function computeSourceCredibility(sourceId: string, signalType: string): number {
  // Check source_id first (more specific), then signal_type
  const normalizedSource = sourceId.toLowerCase().replace(/\s+/g, '-');
  const normalizedType = signalType.toLowerCase().replace(/\s+/g, '-');

  // Try exact match on source_id
  if (SOURCE_CREDIBILITY[normalizedSource] !== undefined) {
    return SOURCE_CREDIBILITY[normalizedSource];
  }

  // Try partial match on source_id (e.g. "kathmandupost-rss" matches "kathmandupost")
  for (const [key, score] of Object.entries(SOURCE_CREDIBILITY)) {
    if (normalizedSource.includes(key) || key.includes(normalizedSource)) {
      return score;
    }
  }

  // Fall back to signal_type
  if (SOURCE_CREDIBILITY[normalizedType] !== undefined) {
    return SOURCE_CREDIBILITY[normalizedType];
  }

  return DEFAULT_CREDIBILITY;
}

// ── Factor 2: Cross-Verification ─────────────────────────────────────────────

const CROSS_VERIFICATION_SCALE: [number, number][] = [
  [0, 0],
  [1, 8],
  [2, 15],
  [3, 15],
  [4, 20],
  [5, 20],
];

function crossVerificationPoints(otherSourceCount: number): number {
  if (otherSourceCount >= 6) return 25;
  if (otherSourceCount >= 4) return 20;
  if (otherSourceCount >= 2) return 15;
  if (otherSourceCount >= 1) return 8;
  return 0;
}

// ── Factor 3: Evidence Quality ───────────────────────────────────────────────

interface SignalRow {
  id: string;
  title: string;
  content: string | null;
  source_id: string;
  signal_type: string;
  url: string;
  published_at: string | null;
  matched_promise_ids: number[] | null;
  relevance_score: number | null;
  extracted_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  media_type: string | null;
  author: string | null;
}

function computeEvidenceQuality(signal: SignalRow): number {
  let points = 0;

  const text = [signal.title, signal.content || ''].join(' ');
  const entities = extractEntities(text);

  // +5 per entity type present (people, amounts, dates) — max 15
  let entityTypesPresent = 0;
  if (entities.people.length > 0) entityTypesPresent++;
  if (entities.amounts.length > 0) entityTypesPresent++;
  if (entities.dates.length > 0) entityTypesPresent++;
  points += Math.min(15, entityTypesPresent * 5);

  // +5 for specific numbers/amounts
  if (entities.amounts.length > 0 || entities.percentages.length > 0) {
    points += 5;
  }

  // +3 for named officials
  if (entities.people.length > 0) {
    points += 3;
  }

  // +5 for document/report reference
  const docPatterns = [
    /gazette/i, /report/i, /document/i, /bill/i, /act/i,
    /ordinance/i, /notice/i, /circular/i, /directive/i,
    /ऐन/u, /विधेयक/u, /राजपत्र/u, /प्रतिवेदन/u, /सूचना/u,
  ];
  if (docPatterns.some((p) => p.test(text))) {
    points += 5;
  }

  // +3 for long content (full article, > 2000 chars)
  if (signal.content && signal.content.length > 2000) {
    points += 3;
  }

  // +2 for media/photo evidence
  if (
    signal.media_type === 'image' ||
    signal.media_type === 'video' ||
    signal.media_type === 'photo'
  ) {
    points += 2;
  }
  // Also check metadata for media
  if (signal.metadata && (signal.metadata as Record<string, unknown>).has_media) {
    points += 2;
  }

  return Math.min(25, points);
}

// ── Factor 4: Community Verification ─────────────────────────────────────────

async function computeCommunityVerification(
  matchedPromiseIds: number[] | null,
): Promise<number> {
  if (!matchedPromiseIds || matchedPromiseIds.length === 0) return 0;

  const supabase = getSupabase();

  const { data: evidence } = await supabase
    .from('citizen_evidence')
    .select('id, status, verified_by')
    .in('promise_id', matchedPromiseIds.map(String))
    .eq('status', 'approved');

  if (!evidence || evidence.length === 0) return 0;

  // Verifier-approved evidence counts double
  let effectiveCount = 0;
  for (const item of evidence) {
    if (item.verified_by) {
      effectiveCount += 2;
    } else {
      effectiveCount += 1;
    }
  }

  if (effectiveCount >= 6) return 25;
  if (effectiveCount >= 3) return 18;
  if (effectiveCount >= 1) return 10;
  return 0;
}

// ── Main computation ─────────────────────────────────────────────────────────

export async function computeTruthScore(signalId: string): Promise<TruthScore> {
  const supabase = getSupabase();

  // Fetch the signal
  const { data: signal, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, content, source_id, signal_type, url, published_at, ' +
      'matched_promise_ids, relevance_score, extracted_data, metadata, media_type, author',
    )
    .eq('id', signalId)
    .single();

  if (error || !signal) {
    return {
      score: 0,
      label: 'unverified',
      factors: {
        sourceCredibility: 0,
        crossVerification: 0,
        evidenceQuality: 0,
        communityVerification: 0,
      },
      reasoning: `Signal ${signalId} not found.`,
      sources: [],
    };
  }

  const typedSignal = signal as unknown as SignalRow;

  // Factor 1: Source Credibility
  const sourceCredibility = computeSourceCredibility(
    typedSignal.source_id,
    typedSignal.signal_type,
  );

  // Factor 2: Cross-Verification
  // Find similar signals by text similarity or shared promise IDs
  const corroboratingSources: string[] = [];
  let crossVerification = 0;

  {
    const signalText = [typedSignal.title, typedSignal.content || ''].join(' ');
    const matchedIds = typedSignal.matched_promise_ids || [];

    // Query candidate signals for cross-verification
    let query = supabase
      .from('intelligence_signals')
      .select('id, title, content, source_id, matched_promise_ids')
      .neq('id', signalId)
      .gte('relevance_score', 0.2)
      .order('published_at', { ascending: false })
      .limit(50);

    // If we have matched promise IDs, prefer those; otherwise use recent signals
    if (matchedIds.length > 0) {
      query = query.overlaps('matched_promise_ids', matchedIds);
    } else {
      // Fall back to recent signals from the same time window
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('discovered_at', cutoff);
    }

    const { data: candidates } = await query;

    if (candidates && candidates.length > 0) {
      const seen = new Set<string>();
      for (const candidate of candidates) {
        const candidateText = [candidate.title, candidate.content || ''].join(' ');
        const similarity = computeSimilarity(signalText, candidateText);

        // Jaccard > 0.5 counts as cross-verification
        if (similarity > 0.5) {
          const srcKey = (candidate.source_id || '').toLowerCase();
          if (!seen.has(srcKey)) {
            seen.add(srcKey);
            corroboratingSources.push(candidate.source_id);
          }
        }
      }

      // Also count signals with same matched_promise_ids from different sources
      if (matchedIds.length > 0) {
        for (const candidate of candidates) {
          const srcKey = (candidate.source_id || '').toLowerCase();
          if (seen.has(srcKey)) continue;

          const candidateIds = (candidate.matched_promise_ids as number[] | null) || [];
          const overlap = matchedIds.some((id) => candidateIds.includes(id));
          if (overlap) {
            seen.add(srcKey);
            corroboratingSources.push(candidate.source_id);
          }
        }
      }
    }

    crossVerification = crossVerificationPoints(corroboratingSources.length);
  }

  // Factor 3: Evidence Quality
  const evidenceQuality = computeEvidenceQuality(typedSignal);

  // Factor 4: Community Verification
  const communityVerification = await computeCommunityVerification(
    typedSignal.matched_promise_ids,
  );

  // Total
  const score = Math.min(
    100,
    sourceCredibility + crossVerification + evidenceQuality + communityVerification,
  );
  const label = getLabel(score);

  // Build reasoning
  const reasoningParts: string[] = [];
  if (sourceCredibility >= 20) {
    reasoningParts.push('established source');
  } else if (sourceCredibility >= 10) {
    reasoningParts.push('secondary source');
  } else {
    reasoningParts.push('unverified source');
  }

  if (corroboratingSources.length > 0) {
    reasoningParts.push(`corroborated by ${corroboratingSources.length} other source(s)`);
  }

  if (evidenceQuality >= 15) {
    reasoningParts.push('strong evidence (entities, data, documents)');
  } else if (evidenceQuality >= 8) {
    reasoningParts.push('moderate evidence');
  }

  if (communityVerification > 0) {
    reasoningParts.push('community-verified');
  }

  const reasoning =
    `Score ${score}/100: ` + reasoningParts.join(', ') + '.';

  return {
    score,
    label,
    factors: {
      sourceCredibility,
      crossVerification,
      evidenceQuality,
      communityVerification,
    },
    reasoning,
    sources: [typedSignal.source_id, ...corroboratingSources],
  };
}

// ── Batch computation ────────────────────────────────────────────────────────

export async function computeTruthScoreBatch(
  signalIds: string[],
): Promise<Map<string, TruthScore>> {
  const results = new Map<string, TruthScore>();

  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  for (let i = 0; i < signalIds.length; i += CONCURRENCY) {
    const batch = signalIds.slice(i, i + CONCURRENCY);
    const scores = await Promise.all(
      batch.map((id) => computeTruthScore(id).then((score) => [id, score] as const)),
    );
    for (const [id, score] of scores) {
      results.set(id, score);
    }
  }

  return results;
}

// ── Average truth score for a commitment ─────────────────────────────────────

export async function getAverageTruthScore(promiseId: number): Promise<number> {
  const supabase = getSupabase();

  // Get signals linked to this promise that already have truth scores in metadata
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, metadata')
    .contains('matched_promise_ids', [promiseId])
    .gte('relevance_score', 0.3)
    .order('published_at', { ascending: false })
    .limit(50);

  if (!signals || signals.length === 0) return 0;

  // Try to use cached truth scores from metadata first
  const cachedScores: number[] = [];
  const uncachedIds: string[] = [];

  for (const signal of signals) {
    const meta = signal.metadata as Record<string, unknown> | null;
    if (meta && typeof meta.truth_score === 'number') {
      cachedScores.push(meta.truth_score as number);
    } else {
      uncachedIds.push(signal.id);
    }
  }

  // Compute any uncached scores (limit to 10 to avoid excessive computation)
  const toCompute = uncachedIds.slice(0, 10);
  if (toCompute.length > 0) {
    const computed = await computeTruthScoreBatch(toCompute);
    for (const [, score] of computed) {
      cachedScores.push(score.score);
    }
  }

  if (cachedScores.length === 0) return 0;

  const avg = cachedScores.reduce((sum, s) => sum + s, 0) / cachedScores.length;
  return Math.round(avg);
}
