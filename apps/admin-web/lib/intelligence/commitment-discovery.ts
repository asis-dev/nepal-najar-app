/**
 * Commitment Discovery Layer
 *
 * Detects NEW government commitments announced in intelligence signals
 * that are not yet part of the tracked commitment universe.
 *
 * Pipeline:
 * 1. Pattern scan — cheap keyword match (English + Nepali) to filter candidates
 * 2. AI analysis — confirm it's a genuine new commitment, extract details
 * 3. Confidence scoring — rate likelihood based on source type
 * 4. Store as discovery metadata on the signal for human review
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from './knowledge-base';
import { CATEGORY_NE, type PromiseCategory } from '@/lib/data/promises';
import { recordSignalReviewAudit } from './review-audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Signal {
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

export interface DiscoveredCommitment {
  what: string;
  who: string;
  when: string | null;
  sector: string | null;
  estimatedBudgetNPR: number | null;
  budgetContext: string | null;
  scope: 'national' | 'provincial' | 'district' | 'municipal' | 'unknown';
  sourceType: string;
}

export interface Discovery {
  signalId: string;
  signalTitle: string;
  signalUrl: string;
  publishedAt: string | null;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  commitment: DiscoveredCommitment;
  status: 'pending' | 'approved' | 'rejected';
  discoveredAt: string;
}

export interface ApproveDiscoveryOptions {
  mode?: 'create' | 'merge';
  targetCommitmentId?: string;
  publish?: boolean;
  reviewedBy?: string;
}

// ---------------------------------------------------------------------------
// 1. Pattern Detection — commitment language keywords
// ---------------------------------------------------------------------------

const COMMITMENT_PATTERNS_EN = [
  'will build',
  'will deliver',
  'committed to',
  'announced',
  'launched',
  'pledged',
  'new initiative',
  'allocated budget for',
  'plans to',
  'going to',
  'committed',
  'vowed to',
  'guaranteed',
  'inaugurated',
  'approved construction',
  'signed agreement',
  'MoU signed',
  'budget allocated',
  'new project',
  'new program',
  'new scheme',
];

const COMMITMENT_PATTERNS_NE = [
  'निर्माण गर्ने',
  'गर्नेछ',
  'प्रतिबद्ध',
  'घोषणा',
  'शुभारम्भ',
  'बजेट विनियोजन',
  'योजना',
  'संकल्प',
  'वचनबद्धता',
  'उद्घाटन',
  'सम्झौता',
  'नयाँ परियोजना',
  'नयाँ कार्यक्रम',
  'बजेट विनियोजित',
  'निर्णय गरेको',
];

const ALL_PATTERNS = [...COMMITMENT_PATTERNS_EN, ...COMMITMENT_PATTERNS_NE];

/**
 * Cheap keyword scan — returns true if the signal text contains
 * any commitment-language pattern.
 */
export function hasCommitmentLanguage(signal: Signal): boolean {
  const text = `${signal.title} ${signal.content || ''}`.toLowerCase();
  return ALL_PATTERNS.some((p) => text.includes(p.toLowerCase()));
}

// ---------------------------------------------------------------------------
// 2. AI-Powered Analysis
// ---------------------------------------------------------------------------

/** Compact list of existing commitment titles for the AI prompt */
function getExistingCommitmentsSummary(): string {
  return PROMISES_KNOWLEDGE.map((p) => `#${p.id}: ${p.title}`).join('\n');
}

interface AIDiscoveryResult {
  isNewCommitment: boolean;
  confidence: number;
  reasoning: string;
  commitment?: {
    what: string;
    who: string;
    when: string | null;
    sector: string | null;
    estimatedBudgetNPR: number | null;
    budgetContext: string | null;
    scope: string;
    sourceType: string;
  };
}

async function analyzeForNewCommitment(
  signal: Signal,
): Promise<AIDiscoveryResult | null> {
  const systemPrompt = `You are an intelligence analyst for Nepal Republic, a government promise tracker.
Your task: determine if a signal contains a NEW government commitment that is NOT already tracked.

EXISTING TRACKED COMMITMENTS (${PROMISES_KNOWLEDGE.length} total):
${getExistingCommitmentsSummary()}

RULES:
1. A "commitment" is a specific, actionable pledge by a government official or body — not a vague statement.
2. It must be NEW — not a restatement or progress update on an existing tracked commitment above.
3. If the signal merely reports progress on an existing commitment, set isNewCommitment=false.
4. Extract: what was committed, by whom (name + title), when, which sector, estimated budget if mentioned.
5. For budget amounts in Nepali: "अर्ब" = billion NPR, "करोड" = 10 million NPR, "लाख" = 100,000 NPR.

CONFIDENCE SCORING:
- HIGH (0.8-1.0): Official press conference, budget speech, gazette notification, official government press release
- MEDIUM (0.5-0.79): News report quoting official directly, parliamentary debate transcript
- LOW (0.3-0.49): Opinion piece, rumor, social media claim, unverified report

Respond in JSON ONLY:
{
  "isNewCommitment": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "explanation of why this is or isn't a new commitment",
  "commitment": {
    "what": "description of the commitment",
    "who": "person/body that made the commitment",
    "when": "date or timeframe if mentioned (ISO format or null)",
    "sector": "Governance|Infrastructure|Energy|Technology|Health|Education|Economy|Environment|Social|Transport|Anti-Corruption|null",
    "estimatedBudgetNPR": number or null,
    "budgetContext": "context for the budget figure or null",
    "scope": "national|provincial|district|municipal|unknown",
    "sourceType": "press_conference|budget_speech|gazette|news_report|parliamentary|social_media|opinion|unknown"
  }
}

If isNewCommitment is false, commitment field can be omitted.`;

  const userPrompt = `Analyze this signal for NEW government commitments:

Type: ${signal.signal_type}
Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 6000)}
Source: ${signal.source_id}
Published: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}
URL: ${signal.url}`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    const parsed = parseJSON<AIDiscoveryResult>(response.content);
    return parsed;
  } catch (err) {
    console.error(
      `[Commitment Discovery] AI analysis failed for signal ${signal.id}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Confidence Level Classification
// ---------------------------------------------------------------------------

function getConfidenceLevel(
  confidence: number,
): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// 4. Storage — write discovery metadata to intelligence_signals
// ---------------------------------------------------------------------------

async function storeDiscovery(
  signalId: string,
  result: AIDiscoveryResult,
  status: 'pending' = 'pending',
): Promise<void> {
  const supabase = getSupabase();

  const discoveryMetadata = {
    potential_new_commitment: true,
    discovery_status: status,
    discovered_at: new Date().toISOString(),
    discovered_commitment: result.commitment,
    discovery_confidence: result.confidence,
    discovery_confidence_level: getConfidenceLevel(result.confidence),
    discovery_reasoning: result.reasoning,
    auto_approved: false,
    needs_review: true,
  };

  // Merge with existing metadata
  const { data: existing } = await supabase
    .from('intelligence_signals')
    .select('metadata')
    .eq('id', signalId)
    .single();

  const currentMetadata =
    (existing?.metadata as Record<string, unknown>) || {};

  await supabase
    .from('intelligence_signals')
    .update({
      metadata: { ...currentMetadata, ...discoveryMetadata },
      review_required: true,
    })
    .eq('id', signalId);
}

// ---------------------------------------------------------------------------
// Main Export: scanForNewCommitments
// ---------------------------------------------------------------------------

/**
 * Scan a batch of signals for potential new government commitments.
 *
 * Pipeline:
 * 1. Pattern filter — skip signals without commitment language
 * 2. AI analysis — ask the model if it's a genuine new commitment
 * 3. Store discoveries — write metadata to the signal row
 *
 * Returns all discoveries found in this batch.
 */
export async function scanForNewCommitments(
  signals: Signal[],
): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  // Step 1: cheap keyword filter
  const candidates = signals.filter(hasCommitmentLanguage);

  if (candidates.length === 0) return discoveries;

  console.log(
    `[Commitment Discovery] ${candidates.length}/${signals.length} signals match commitment patterns`,
  );

  // Step 2 + 3: AI analysis + review queue routing
  for (const signal of candidates) {
    // Skip if already analyzed for commitments
    const meta = signal.metadata || {};
    if ((meta as Record<string, unknown>).potential_new_commitment) {
      continue;
    }

    const result = await analyzeForNewCommitment(signal);

    if (!result || !result.isNewCommitment || !result.commitment) {
      continue;
    }

    // Confidence < 0.5 → Discard, don't store
    if (result.confidence < 0.5) {
      console.log(
        `[Commitment Discovery] Discarded low-confidence (${result.confidence}) discovery: ${signal.title}`,
      );
      continue;
    }

    await storeDiscovery(signal.id, result, 'pending');

    const discovery: Discovery = {
      signalId: signal.id,
      signalTitle: signal.title,
      signalUrl: signal.url,
      publishedAt: signal.published_at,
      confidence: result.confidence,
      confidenceLevel: getConfidenceLevel(result.confidence),
      reasoning: result.reasoning,
      commitment: {
        what: result.commitment.what,
        who: result.commitment.who,
        when: result.commitment.when,
        sector: result.commitment.sector,
        estimatedBudgetNPR: result.commitment.estimatedBudgetNPR,
        budgetContext: result.commitment.budgetContext,
        scope: (result.commitment.scope as DiscoveredCommitment['scope']) || 'unknown',
        sourceType: result.commitment.sourceType || 'unknown',
      },
      status: 'pending',
      discoveredAt: new Date().toISOString(),
    };

    discoveries.push(discovery);

    // Rate-limit AI calls
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `[Commitment Discovery] Found ${discoveries.length} potential new commitments`,
  );

  return discoveries;
}

// ---------------------------------------------------------------------------
// 5. Review Queue
// ---------------------------------------------------------------------------

/**
 * Get all pending commitment discoveries awaiting human review.
 */
export async function getPendingDiscoveries(): Promise<Discovery[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('metadata->>potential_new_commitment', 'true')
    .eq('metadata->>discovery_status', 'pending')
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Commitment Discovery] Failed to fetch pending:', error);
    return [];
  }

  return (data || []).map(signalToDiscovery);
}

const SECTOR_TO_CATEGORY: Record<string, PromiseCategory> = {
  Governance: 'Governance',
  Infrastructure: 'Infrastructure',
  Energy: 'Energy',
  Technology: 'Technology',
  Health: 'Health',
  Education: 'Education',
  Economy: 'Economy',
  Environment: 'Environment',
  Social: 'Social',
  Transport: 'Transport',
  'Anti-Corruption': 'Anti-Corruption',
};

function toPromiseCategory(sector: string | null | undefined): PromiseCategory {
  if (!sector) return 'Governance';
  return SECTOR_TO_CATEGORY[sector] || 'Governance';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function dedupeActors(existing: string[] | null | undefined, incoming: string[]): string[] {
  return Array.from(new Set([...(existing || []), ...incoming].map((value) => value.trim()).filter(Boolean)));
}

function buildActors(raw: string): string[] {
  const parts = raw
    .split(/,| and | & |;/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [raw.trim()].filter(Boolean);
}

async function getSignalDiscoveryContext(signalId: string): Promise<{
  signal: Signal;
  metadata: Record<string, unknown>;
  commitment: Record<string, unknown>;
}> {
  const supabase = getSupabase();

  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select(
      'id, source_id, signal_type, title, content, url, published_at, author, media_type, metadata, matched_promise_ids',
    )
    .eq('id', signalId)
    .single();

  if (!signal) throw new Error(`Signal ${signalId} not found`);

  const metadata = (signal.metadata as Record<string, unknown>) || {};
  const commitment =
    (metadata.discovered_commitment as Record<string, unknown>) || {};

  return {
    signal: signal as unknown as Signal,
    metadata,
    commitment,
  };
}

async function getNextCommitmentId(): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('promises').select('id');

  if (error) {
    throw new Error(error.message);
  }

  const maxId = Math.max(
    0,
    ...(data || [])
      .map((row) => parseInt(String(row.id), 10))
      .filter((value) => Number.isFinite(value)),
  );

  return String(maxId + 1);
}

async function getUniqueCommitmentSlug(baseTitle: string, fallbackId: string): Promise<string> {
  const supabase = getSupabase();
  const baseSlug = slugify(baseTitle) || `commitment-${fallbackId}`;

  const { data } = await supabase
    .from('promises')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  const existing = new Set((data || []).map((row) => String(row.slug)));
  if (!existing.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (existing.has(`${baseSlug}-${suffix}`)) {
    suffix++;
  }

  return `${baseSlug}-${suffix}`;
}

async function createCommitmentFromDiscovery(
  signal: Signal,
  commitment: Record<string, unknown>,
  options?: ApproveDiscoveryOptions,
): Promise<string> {
  const supabase = getSupabase();
  const id = await getNextCommitmentId();
  const title = String(commitment.what || signal.title || `Discovered commitment ${id}`).trim();
  const category = toPromiseCategory((commitment.sector as string) || null);
  const reviewState = options?.publish ? 'published' : 'candidate';
  const isPublic = options?.publish ?? false;
  const slug = await getUniqueCommitmentSlug(title, id);
  const today = new Date().toISOString().slice(0, 10);
  const actors = buildActors(String(commitment.who || signal.author || 'Government'));
  const estimatedBudget = commitment.estimatedBudgetNPR;

  const { error } = await supabase.from('promises').insert({
    id,
    slug,
    title,
    title_ne: title,
    category,
    category_ne: CATEGORY_NE[category],
    status: 'not_started',
    progress: 0,
    linked_projects: 0,
    evidence_count: 0,
    last_update: today,
    description: title,
    description_ne: title,
    trust_level: 'partial',
    signal_type: 'discovered',
    summary: signal.title,
    summary_ne: signal.title,
    scope: (commitment.scope as string) || 'unknown',
    actors,
    review_state: reviewState,
    is_public: isPublic,
    source_count: 1,
    last_signal_at: signal.published_at || new Date().toISOString(),
    estimated_budget_npr:
      typeof estimatedBudget === 'number' ? estimatedBudget : null,
    published_at: isPublic ? new Date().toISOString() : null,
    origin_signal_id: signal.id,
    review_notes: `Created from discovery signal ${signal.id}${options?.reviewedBy ? ` by ${options.reviewedBy}` : ''}`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return id;
}

async function mergeDiscoveryIntoCommitment(
  signal: Signal,
  commitment: Record<string, unknown>,
  targetCommitmentId: string,
  options?: ApproveDiscoveryOptions,
): Promise<string> {
  const supabase = getSupabase();
  const { data: existing, error } = await supabase
    .from('promises')
    .select('id, actors, source_count, review_state, is_public')
    .eq('id', targetCommitmentId)
    .single();

  if (error || !existing) {
    throw new Error(`Target commitment ${targetCommitmentId} not found`);
  }

  const actors = dedupeActors(
    (existing.actors as string[] | null) || [],
    buildActors(String(commitment.who || signal.author || 'Government')),
  );

  const reviewState =
    options?.publish && existing.review_state !== 'published'
      ? 'published'
      : existing.review_state;

  const { error: updateError } = await supabase
    .from('promises')
    .update({
      actors,
      source_count: ((existing.source_count as number | null) || 0) + 1,
      last_signal_at: signal.published_at || new Date().toISOString(),
      review_state: reviewState,
      is_public: options?.publish ? true : existing.is_public,
      published_at:
        options?.publish && !existing.is_public ? new Date().toISOString() : undefined,
      review_notes: `Merged discovery signal ${signal.id} into commitment ${targetCommitmentId}`,
    })
    .eq('id', targetCommitmentId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return targetCommitmentId;
}

function appendMatchedPromiseId(
  current: number[] | null | undefined,
  commitmentId: string,
): number[] | undefined {
  const numericId = parseInt(commitmentId, 10);
  if (!Number.isFinite(numericId)) return current || undefined;
  const values = new Set(current || []);
  values.add(numericId);
  return Array.from(values);
}

export async function approveDiscovery(
  signalId: string,
  options?: ApproveDiscoveryOptions,
): Promise<{ commitmentId: string; mode: 'create' | 'merge' }> {
  const supabase = getSupabase();
  const { signal, metadata, commitment } = await getSignalDiscoveryContext(signalId);

  if (!commitment.what) {
    throw new Error(`Signal ${signalId} does not contain discovered commitment data`);
  }

  const mode = options?.mode === 'merge' ? 'merge' : 'create';
  const commitmentId =
    mode === 'merge'
      ? await mergeDiscoveryIntoCommitment(
          signal,
          commitment,
          options?.targetCommitmentId || '',
          options,
        )
      : await createCommitmentFromDiscovery(signal, commitment, options);

  const matchedPromiseIds = appendMatchedPromiseId(
    (metadata.matched_promise_ids as number[] | undefined) ||
      ((signal as unknown as { matched_promise_ids?: number[] }).matched_promise_ids || []),
    commitmentId,
  );

  await supabase
    .from('intelligence_signals')
    .update({
      matched_promise_ids: matchedPromiseIds,
      review_required: false,
      review_status: 'approved',
      metadata: {
        ...metadata,
        discovery_status: 'approved',
        discovery_reviewed_at: new Date().toISOString(),
        discovery_reviewed_by: options?.reviewedBy || 'admin',
        discovery_mode: mode,
        discovery_commitment_id: commitmentId,
      },
    })
    .eq('id', signalId);

  await recordSignalReviewAudit({
    signalId,
    action: 'approved',
    reviewer: options?.reviewedBy || 'admin',
    notes:
      mode === 'merge'
        ? `Discovery merged into commitment ${commitmentId}`
        : `Discovery approved as commitment ${commitmentId}`,
  });

  return { commitmentId, mode };
}

/**
 * Reject a discovery — marks it as rejected so it won't appear
 * in the review queue again.
 */
export async function rejectDiscovery(signalId: string): Promise<void> {
  const supabase = getSupabase();
  const { metadata } = await getSignalDiscoveryContext(signalId);

  await supabase
    .from('intelligence_signals')
    .update({
      review_required: false,
      review_status: 'rejected',
      metadata: {
        ...metadata,
        discovery_status: 'rejected',
        discovery_reviewed_at: new Date().toISOString(),
      },
    })
    .eq('id', signalId);

  await recordSignalReviewAudit({
    signalId,
    action: 'rejected',
    reviewer: 'admin',
    notes: 'Discovery rejected',
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalToDiscovery(row: Record<string, unknown>): Discovery {
  const meta = (row.metadata as Record<string, unknown>) || {};
  const commitment = (meta.discovered_commitment as Record<string, unknown>) || {};

  return {
    signalId: row.id as string,
    signalTitle: row.title as string,
    signalUrl: row.url as string,
    publishedAt: (row.published_at as string) || null,
    confidence: (meta.discovery_confidence as number) || 0,
    confidenceLevel:
      (meta.discovery_confidence_level as 'high' | 'medium' | 'low') || 'low',
    reasoning: (meta.discovery_reasoning as string) || '',
    commitment: {
      what: (commitment.what as string) || '',
      who: (commitment.who as string) || '',
      when: (commitment.when as string) || null,
      sector: (commitment.sector as string) || null,
      estimatedBudgetNPR: (commitment.estimatedBudgetNPR as number) || null,
      budgetContext: (commitment.budgetContext as string) || null,
      scope:
        (commitment.scope as DiscoveredCommitment['scope']) || 'unknown',
      sourceType: (commitment.sourceType as string) || 'unknown',
    },
    status: (meta.discovery_status as Discovery['status']) || 'pending',
    discoveredAt: (meta.discovered_at as string) || '',
  };
}

function parseJSON<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
