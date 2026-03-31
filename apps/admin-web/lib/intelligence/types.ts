export const CLASSIFICATION_VALUES = [
  'confirms',
  'contradicts',
  'neutral',
  'budget_allocation',
  'policy_change',
  'statement',
] as const;

export type Classification = (typeof CLASSIFICATION_VALUES)[number];

const CLASSIFICATION_ALIASES: Record<string, Classification> = {
  confirm: 'confirms',
  confirms: 'confirms',
  contradict: 'contradicts',
  contradicts: 'contradicts',
  neutral: 'neutral',
  budget: 'budget_allocation',
  budget_allocation: 'budget_allocation',
  policy: 'policy_change',
  policy_change: 'policy_change',
  statement: 'statement',
};

export function normalizeClassification(input: unknown): Classification {
  if (typeof input !== 'string') return 'neutral';
  const key = input.trim().toLowerCase();
  return CLASSIFICATION_ALIASES[key] || 'neutral';
}

export function needsHumanReview(params: {
  confidence?: number | null;
  relevanceScore?: number | null;
  matchedPromiseIds?: number[] | null;
}): boolean {
  const confidenceKnown =
    typeof params.confidence === 'number' && Number.isFinite(params.confidence);
  const confidence = confidenceKnown ? (params.confidence as number) : null;
  const relevance = params.relevanceScore ?? 0;
  const matches = params.matchedPromiseIds?.length ?? 0;

  // Confidence is only meaningful after Tier 3. Missing confidence should not
  // force review by itself.
  const lowConfidence = confidence !== null && confidence < 0.45;
  const borderlineRelevance = relevance >= 0.3 && relevance < 0.45;
  const tooManyMatches = matches > 3;

  return lowConfidence || borderlineRelevance || tooManyMatches;
}
