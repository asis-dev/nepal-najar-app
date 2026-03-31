/**
 * Dispute Validator
 *
 * Filters false-positive "disputes" from the naive confirms-vs-contradicts grouping.
 * A real dispute requires: different actors, same claim, corroboration, temporal proximity.
 *
 * Zero AI calls — works with data already extracted by brain tier 3.
 */

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface SignalForValidation {
  id: string;
  classification?: string | null;
  confidence?: number | null;
  source_id: string;
  discovered_at: string;
  reasoning?: string | null;
  extracted_data?: {
    officials?: { name: string; title?: string; statement?: string }[];
    organizations?: string[];
    [key: string]: unknown;
  } | null;
}

export interface DisputeValidation {
  promiseId: number;
  disputeStrength: number;
  isGenuineDispute: boolean;
  isInternalDiscussion: boolean;
  actorDifferentiation: number;
  claimOverlap: number;
  corroboration: number;
  temporalProximity: number;
  avgContradictConfidence: number;
  confirmsActors: string[];
  contradictsActors: string[];
  filterReason?: string;
}

/* ═══════════════════════════════════════════════
   STOP WORDS (for keyword extraction)
   ═══════════════════════════════════════════════ */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'not',
  'this', 'that', 'it', 'its', 'as', 'also', 'more', 'some', 'all',
  'nepal', 'government', 'minister', 'said', 'says', 'according',
  'report', 'new', 'year', 'about', 'after', 'before', 'been',
  'signal', 'confirms', 'contradicts', 'evidence', 'commitment',
  'progress', 'status', 'update', 'activity',
]);

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractActorNames(signals: SignalForValidation[]): string[] {
  const names = new Set<string>();
  for (const s of signals) {
    const officials = s.extracted_data?.officials || [];
    for (const o of officials) {
      if (o.name && o.name.trim().length > 1) {
        names.add(o.name.trim().toLowerCase());
      }
    }
    const orgs = s.extracted_data?.organizations || [];
    for (const org of orgs) {
      if (typeof org === 'string' && org.trim().length > 1) {
        names.add(org.trim().toLowerCase());
      }
    }
  }
  return [...names];
}

function extractReasoningKeywords(signals: SignalForValidation[]): Set<string> {
  const combined = signals.map((s) => s.reasoning || '').join(' ');
  return extractKeywords(combined);
}

/* ═══════════════════════════════════════════════
   VALIDATION TESTS
   ═══════════════════════════════════════════════ */

/**
 * Test 1: Actor Differentiation (30%)
 * Are the actors on each side actually different people/orgs?
 */
function testActorDifferentiation(
  confirmsActors: string[],
  contradictsActors: string[],
): { score: number; isInternalDiscussion: boolean } {
  if (confirmsActors.length === 0 && contradictsActors.length === 0) {
    // No actors extracted on either side — can't validate
    return { score: 0.3, isInternalDiscussion: false };
  }

  if (confirmsActors.length === 0 || contradictsActors.length === 0) {
    // Actors on one side only — partial validation
    return { score: 0.4, isInternalDiscussion: false };
  }

  // Check overlap
  const confirmsSet = new Set(confirmsActors);
  const overlap = contradictsActors.filter((a) => confirmsSet.has(a));
  const overlapRatio = overlap.length / Math.max(confirmsActors.length, contradictsActors.length);

  // If all actors are the same → internal discussion
  if (overlapRatio > 0.7) {
    return { score: 0.1, isInternalDiscussion: true };
  }

  // Partially different actors
  if (overlapRatio > 0.3) {
    return { score: 0.5, isInternalDiscussion: false };
  }

  // Completely different actors → real dispute
  return { score: 1.0, isInternalDiscussion: false };
}

/**
 * Test 2: Claim Overlap (25%)
 * Are they talking about the same specific thing?
 */
function testClaimOverlap(
  confirmsSignals: SignalForValidation[],
  contradictsSignals: SignalForValidation[],
): number {
  const confirmsKw = extractReasoningKeywords(confirmsSignals);
  const contradictsKw = extractReasoningKeywords(contradictsSignals);

  const similarity = jaccardSimilarity(confirmsKw, contradictsKw);

  // High similarity = they're about the same thing = more likely a real dispute
  // Low similarity = different aspects = probably not a real dispute
  return similarity >= 0.15 ? Math.min(1, similarity * 3) : 0;
}

/**
 * Test 3: Corroboration (20%)
 * Real disputes have multiple sources per position.
 */
function testCorroboration(
  confirmsSignals: SignalForValidation[],
  contradictsSignals: SignalForValidation[],
): number {
  const confirmsSources = new Set(confirmsSignals.map((s) => s.source_id)).size;
  const contradictsSources = new Set(contradictsSignals.map((s) => s.source_id)).size;
  const minSources = Math.min(confirmsSources, contradictsSources);
  return Math.min(1, minSources / 2);
}

/**
 * Test 4: Temporal Proximity (15%)
 * Signals from the same week score higher.
 */
function testTemporalProximity(
  confirmsSignals: SignalForValidation[],
  contradictsSignals: SignalForValidation[],
): number {
  const confirmsDates = confirmsSignals.map((s) => new Date(s.discovered_at).getTime());
  const contradictsDates = contradictsSignals.map((s) => new Date(s.discovered_at).getTime());

  if (confirmsDates.length === 0 || contradictsDates.length === 0) return 0;

  const confirmsMedian = confirmsDates.sort()[Math.floor(confirmsDates.length / 2)];
  const contradictsMedian = contradictsDates.sort()[Math.floor(contradictsDates.length / 2)];

  const daysDiff = Math.abs(confirmsMedian - contradictsMedian) / (24 * 60 * 60 * 1000);

  if (daysDiff <= 3) return 1.0;
  if (daysDiff <= 7) return 0.8;
  if (daysDiff <= 14) return 0.5;
  if (daysDiff <= 30) return 0.3;
  return 0.1;
}

/**
 * Test 5: Contradiction Confidence (10%)
 * Low-confidence contradictions are likely misclassifications.
 */
function testContradictConfidence(contradictsSignals: SignalForValidation[]): number {
  if (contradictsSignals.length === 0) return 0;
  const avgConf = contradictsSignals.reduce((s, sig) => s + (sig.confidence ?? 0.5), 0) / contradictsSignals.length;
  return avgConf;
}

/* ═══════════════════════════════════════════════
   MAIN VALIDATOR
   ═══════════════════════════════════════════════ */

const WEIGHTS = {
  actorDifferentiation: 0.30,
  claimOverlap: 0.25,
  corroboration: 0.20,
  temporalProximity: 0.15,
  contradictConfidence: 0.10,
};

const GENUINE_THRESHOLD = 0.35;

export function validateDispute(
  promiseId: number,
  confirmsSignals: SignalForValidation[],
  contradictsSignals: SignalForValidation[],
): DisputeValidation {
  const confirmsActors = extractActorNames(confirmsSignals);
  const contradictsActors = extractActorNames(contradictsSignals);

  const actorTest = testActorDifferentiation(confirmsActors, contradictsActors);
  const claimOverlap = testClaimOverlap(confirmsSignals, contradictsSignals);
  const corroboration = testCorroboration(confirmsSignals, contradictsSignals);
  const temporalProximity = testTemporalProximity(confirmsSignals, contradictsSignals);
  const avgContradictConfidence = testContradictConfidence(contradictsSignals);

  const disputeStrength =
    WEIGHTS.actorDifferentiation * actorTest.score +
    WEIGHTS.claimOverlap * claimOverlap +
    WEIGHTS.corroboration * corroboration +
    WEIGHTS.temporalProximity * temporalProximity +
    WEIGHTS.contradictConfidence * avgContradictConfidence;

  const isGenuineDispute = disputeStrength >= GENUINE_THRESHOLD && !actorTest.isInternalDiscussion;

  let filterReason: string | undefined;
  if (!isGenuineDispute) {
    if (actorTest.isInternalDiscussion) filterReason = 'Same actors on both sides — internal discussion';
    else if (claimOverlap < 0.1) filterReason = 'Signals discuss different aspects of the commitment';
    else if (corroboration < 0.3) filterReason = 'Insufficient corroboration — isolated report';
    else filterReason = 'Dispute strength below threshold';
  }

  return {
    promiseId,
    disputeStrength: Math.round(disputeStrength * 100) / 100,
    isGenuineDispute,
    isInternalDiscussion: actorTest.isInternalDiscussion,
    actorDifferentiation: Math.round(actorTest.score * 100) / 100,
    claimOverlap: Math.round(claimOverlap * 100) / 100,
    corroboration: Math.round(corroboration * 100) / 100,
    temporalProximity: Math.round(temporalProximity * 100) / 100,
    avgContradictConfidence: Math.round(avgContradictConfidence * 100) / 100,
    confirmsActors,
    contradictsActors,
    filterReason,
  };
}
