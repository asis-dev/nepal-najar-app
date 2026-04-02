/**
 * Corruption Case Auto-Discovery
 *
 * Detects corruption cases and allegations from intelligence signals.
 * Adapted from the commitment-discovery pattern.
 *
 * Pipeline:
 * 1. Pattern scan -- cheap keyword match (English + Nepali) to filter candidates
 * 2. AI analysis -- confirm it's an actual corruption case/allegation, extract details
 * 3. Confidence scoring -- rate likelihood based on source type and specificity
 * 4. Store as discovery metadata on the signal for human review
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';
import { recordSignalReviewAudit } from './review-audit';
import type {
  CorruptionType,
  CaseStatus,
  Severity,
  EntityType,
  EntityRole,
  EvidenceType,
  EvidenceReliability,
  TimelineEventType,
  DatePrecision,
} from '@/lib/data/corruption-types';

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

export interface DiscoveredEntity {
  name: string;
  entity_type: EntityType;
  role: EntityRole;
  title?: string | null;
  party_affiliation?: string | null;
}

export interface DiscoveredCorruption {
  title: string;
  corruption_type: CorruptionType;
  severity: Severity;
  estimated_amount_npr: number | null;
  summary: string;
  entities: DiscoveredEntity[];
  source_urls: string[];
  status: CaseStatus;
  tags: string[];
}

export interface CorruptionDiscovery {
  signalId: string;
  signalTitle: string;
  signalUrl: string;
  publishedAt: string | null;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  corruption: DiscoveredCorruption;
  status: 'pending' | 'approved' | 'rejected';
  discoveredAt: string;
}

export interface ApproveCorruptionDiscoveryOptions {
  reviewedBy?: string;
}

// ---------------------------------------------------------------------------
// 1. Pattern Detection -- corruption language keywords
// ---------------------------------------------------------------------------

const CORRUPTION_PATTERNS_EN = [
  'corruption',
  'bribery',
  'embezzlement',
  'fraud',
  'scandal',
  'scam',
  'ciaa',
  'investigation',
  'arrested',
  'charged',
  'indicted',
  'money laundering',
  'kickback',
  'procurement fraud',
  'land grab',
  'tax evasion',
  'abuse of authority',
  'asset frozen',
  'prosecution',
  'convicted',
  'acquitted',
  'misappropriation',
  'irregular tender',
  'fake bills',
  'ghost project',
  'nepotism',
  'commission agent',
  'suspicious wealth',
  'disproportionate assets',
];

const CORRUPTION_PATTERNS_NE = [
  '\u092D\u094D\u0930\u0937\u094D\u091F\u093E\u091A\u093E\u0930',  // भ्रष्टाचार
  '\u0918\u0941\u0938',              // घुस
  '\u0939\u093F\u0928\u093E\u092E\u093F\u0928\u093E',   // हिनामिना
  '\u0920\u0917\u0940',              // ठगी
  '\u0905\u0916\u094D\u0924\u093F\u092F\u093E\u0930',   // अख्तियार
  '\u0905\u0928\u0941\u0938\u0928\u094D\u0927\u093E\u0928',  // अनुसन्धान
  '\u092A\u0915\u094D\u0930\u093E\u0909',   // पक्राउ
  '\u0905\u092D\u093F\u092F\u094B\u0917',   // अभियोग
  '\u0927\u0928\u0936\u094B\u0927\u0928',   // धनशोधन
  '\u0918\u094B\u091F\u093E\u0932\u093E',   // घोटाला
  '\u091C\u0917\u094D\u0917\u093E \u0915\u092C\u094D\u091C\u093E',  // जग्गा कब्जा
  '\u0915\u0930 \u091B\u0932\u0940',         // कर छली
  '\u0905\u092A\u091A\u0932\u0928',          // अपचलन
  '\u0928\u093E\u0924\u093E\u0935\u093E\u0926',  // नातावाद
  '\u0915\u092E\u093F\u0938\u0928',          // कमिसन
  '\u0905\u0927\u093F\u0915\u093E\u0930 \u0926\u0941\u0930\u0941\u092A\u092F\u094B\u0917',  // अधिकार दुरुपयोग
  '\u0938\u092E\u094D\u092A\u0924\u094D\u0924\u093F \u0930\u094B\u0915\u094D\u0915\u093E',  // सम्पत्ति रोक्का
  '\u0917\u093F\u0930\u092B\u094D\u0924\u093E\u0930',   // गिरफ्तार
  '\u092B\u0930\u093E\u0930',                // फरार
];

const ALL_CORRUPTION_PATTERNS = [
  ...CORRUPTION_PATTERNS_EN,
  ...CORRUPTION_PATTERNS_NE,
];

/**
 * Cheap keyword scan -- returns true if the signal text contains
 * any corruption-related pattern.
 */
export function hasCorruptionLanguage(signal: Signal): boolean {
  const text = `${signal.title} ${signal.content || ''}`.toLowerCase();
  return ALL_CORRUPTION_PATTERNS.some((p) => text.includes(p.toLowerCase()));
}

// ---------------------------------------------------------------------------
// 2. AI-Powered Analysis
// ---------------------------------------------------------------------------

interface AICorruptionResult {
  isCorruptionCase: boolean;
  confidence: number;
  reasoning: string;
  corruption?: {
    title: string;
    corruption_type: CorruptionType;
    severity: Severity;
    estimated_amount_npr: number | null;
    summary: string;
    status: CaseStatus;
    entities: Array<{
      name: string;
      entity_type: EntityType;
      role: EntityRole;
      title?: string | null;
      party_affiliation?: string | null;
    }>;
    source_urls: string[];
    tags: string[];
  };
}

/**
 * Deep AI analysis of a single signal for corruption case detection.
 */
export async function analyzeCorruptionSignal(
  signal: Signal,
): Promise<AICorruptionResult | null> {
  const systemPrompt = `You are an anti-corruption intelligence analyst for Nepal Republic, a civic accountability platform.
Your task: determine if a signal reports an actual corruption case, and extract CLEAR, SIMPLE facts that any citizen can understand.

NEPAL CONTEXT:
- CIAA (अख्तियार) = main anti-corruption body
- DRI = revenue investigation, CIB = police investigation
- Parties: NC, UML, Maoist Centre, RSP, JSP, RPP
- Currency: "अर्ब" = billion NPR, "करोड" = 10 million NPR, "लाख" = 100K NPR

WHAT IS A CORRUPTION CASE:
- Specific people/orgs involved in bribery, embezzlement, fraud, land grab, tax evasion, procurement fraud, nepotism, money laundering, abuse of authority, kickbacks
- Investigations, arrests, charges, trials, verdicts, asset recovery
- NOT: general opinion pieces, policy discussions, reform announcements

WHAT TO EXTRACT (make it easy for a regular person to understand):
1. WHO: Full names + their position (e.g. "KP Sharma Oli, Former PM, UML")
2. WHAT: What did they do/are accused of? One clear sentence.
3. HOW MUCH: Estimated amount involved. If article mentions amounts, use them. If not, say null. ALWAYS use the word "estimated" when giving amounts.
4. STATUS: Where is the case now? Use one of:
   - "alleged" = accusation made, no formal action yet
   - "under_investigation" = CIAA/CIB/police actively investigating
   - "charged" = formal charges filed in court
   - "trial" = court proceedings ongoing
   - "convicted" = found guilty
   - "acquitted" = found not guilty
   - "in_custody" = currently in jail/detention
   - "asset_recovery" = assets being seized/frozen
   - "closed" = case closed
5. ACCOUNTABILITY: Is anyone in jail? Is anyone out on bail? Expected next step?

SEVERITY:
- minor: < 1 crore NPR
- major: 1-100 crore NPR
- mega: > 100 crore NPR or systemic/nationwide impact

CONFIDENCE:
- HIGH (0.8-1.0): Official report, court filing, arrest announcement
- MEDIUM (0.5-0.79): Named-source news report, investigative journalism
- LOW (0.3-0.49): Social media allegation, opinion piece

Respond in JSON ONLY:
{
  "isCorruptionCase": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "why this is/isn't a corruption case",
  "corruption": {
    "title": "Case Name (e.g. 'Lalita Niwas Land Grab Case')",
    "corruption_type": "bribery|embezzlement|nepotism|money_laundering|land_grab|procurement_fraud|tax_evasion|abuse_of_authority|kickback|other",
    "severity": "minor|major|mega",
    "estimated_amount_npr": number or null,
    "estimated_amount_label": "e.g. 'Estimated 15 crore NPR' or null",
    "summary": "Plain language: WHO did WHAT. One clear sentence a taxi driver would understand.",
    "summary_ne": "Same summary in simple Nepali",
    "status": "alleged|under_investigation|charged|trial|convicted|acquitted|in_custody|asset_recovery|closed",
    "accountability_status": "e.g. '2 people in custody, 3 out on bail' or 'No arrests yet' or 'Convicted, serving 5 years'",
    "next_expected": "e.g. 'Court hearing on April 15' or 'Investigation ongoing' or null",
    "entities": [
      {
        "name": "Full Name",
        "entity_type": "person|politician|official|company|organization|shell_company|bank_account|property",
        "role": "accused|witness|victim|investigator|beneficiary|whistleblower|facilitator|accomplice",
        "title": "their position/title or null",
        "party_affiliation": "party name or null"
      }
    ],
    "source_urls": ["url1"],
    "tags": ["relevant", "tags"]
  }
}

If isCorruptionCase is false, omit the corruption field.`;

  const userPrompt = `Analyze this signal for corruption cases or allegations:

Type: ${signal.signal_type}
Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 6000)}
Source: ${signal.source_id}
Published: ${signal.published_at || 'unknown'}
Author: ${signal.author || 'unknown'}
URL: ${signal.url}`;

  try {
    const response = await aiComplete('reason', systemPrompt, userPrompt);
    const parsed = parseJSON<AICorruptionResult>(response.content);
    return parsed;
  } catch (err) {
    console.error(
      `[Corruption Discovery] AI analysis failed for signal ${signal.id}:`,
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
// 4. Storage -- write discovery metadata to intelligence_signals
// ---------------------------------------------------------------------------

async function storeCorruptionDiscovery(
  signalId: string,
  result: AICorruptionResult,
  status: 'pending' = 'pending',
): Promise<void> {
  const supabase = getSupabase();

  const discoveryMetadata = {
    potential_corruption_case: true,
    corruption_discovery_status: status,
    corruption_discovered_at: new Date().toISOString(),
    discovered_corruption: result.corruption,
    corruption_discovery_confidence: result.confidence,
    corruption_discovery_confidence_level: getConfidenceLevel(result.confidence),
    corruption_discovery_reasoning: result.reasoning,
    corruption_auto_approved: false,
    corruption_needs_review: true,
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
// Main Export: scanForCorruptionCases
// ---------------------------------------------------------------------------

/**
 * Scan a batch of signals for potential corruption cases.
 *
 * Pipeline:
 * 1. Pattern filter -- skip signals without corruption language
 * 2. AI analysis -- ask the model if it's a genuine corruption case
 * 3. Store discoveries -- write metadata to the signal row
 *
 * Returns all discoveries found in this batch.
 */
export async function scanForCorruptionCases(
  signals: Signal[],
): Promise<CorruptionDiscovery[]> {
  const discoveries: CorruptionDiscovery[] = [];

  // Step 1: cheap keyword filter
  const candidates = signals.filter(hasCorruptionLanguage);

  if (candidates.length === 0) return discoveries;

  console.log(
    `[Corruption Discovery] ${candidates.length}/${signals.length} signals match corruption patterns`,
  );

  // Step 2 + 3: AI analysis + store
  for (const signal of candidates) {
    // Skip if already analyzed for corruption
    const meta = signal.metadata || {};
    if ((meta as Record<string, unknown>).potential_corruption_case) {
      continue;
    }

    const result = await analyzeCorruptionSignal(signal);

    if (!result || !result.isCorruptionCase || !result.corruption) {
      continue;
    }

    // Confidence < 0.3 -> Discard
    if (result.confidence < 0.3) {
      console.log(
        `[Corruption Discovery] Discarded low-confidence (${result.confidence}) discovery: ${signal.title}`,
      );
      continue;
    }

    await storeCorruptionDiscovery(signal.id, result, 'pending');

    const discovery: CorruptionDiscovery = {
      signalId: signal.id,
      signalTitle: signal.title,
      signalUrl: signal.url,
      publishedAt: signal.published_at,
      confidence: result.confidence,
      confidenceLevel: getConfidenceLevel(result.confidence),
      reasoning: result.reasoning,
      corruption: {
        title: result.corruption.title,
        corruption_type: result.corruption.corruption_type,
        severity: result.corruption.severity,
        estimated_amount_npr: result.corruption.estimated_amount_npr,
        summary: result.corruption.summary,
        entities: result.corruption.entities || [],
        source_urls: result.corruption.source_urls || [signal.url],
        status: result.corruption.status || 'alleged',
        tags: result.corruption.tags || [],
      },
      status: 'pending',
      discoveredAt: new Date().toISOString(),
    };

    discoveries.push(discovery);

    // Rate-limit AI calls
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `[Corruption Discovery] Found ${discoveries.length} potential corruption cases`,
  );

  return discoveries;
}

// ---------------------------------------------------------------------------
// 5. Review Queue
// ---------------------------------------------------------------------------

/**
 * Get pending corruption discoveries awaiting human review.
 */
export async function getPendingCorruptionDiscoveries(
  statusFilter: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<CorruptionDiscovery[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('metadata->>potential_corruption_case', 'true')
    .eq('metadata->>corruption_discovery_status', statusFilter)
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Corruption Discovery] Failed to fetch discoveries:', error);
    return [];
  }

  return (data || []).map(signalToCorruptionDiscovery);
}

// ---------------------------------------------------------------------------
// 6. Approve / Reject
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function getUniqueCaseSlug(baseTitle: string): Promise<string> {
  const supabase = getSupabase();
  const baseSlug = slugify(baseTitle) || `corruption-case-${Date.now()}`;

  const { data } = await supabase
    .from('corruption_cases')
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

/**
 * Approve a corruption discovery -- creates the actual corruption_case,
 * entities, case_entity links, and evidence records.
 */
export async function approveCorruptionDiscovery(
  signalId: string,
  options?: ApproveCorruptionDiscoveryOptions,
): Promise<{ caseId: string }> {
  const supabase = getSupabase();

  // Load the signal
  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('*')
    .eq('id', signalId)
    .single();

  if (!signal) throw new Error(`Signal ${signalId} not found`);

  const metadata = (signal.metadata as Record<string, unknown>) || {};
  const discovered = (metadata.discovered_corruption as Record<string, unknown>) || {};

  if (!discovered.title) {
    throw new Error(`Signal ${signalId} does not contain discovered corruption data`);
  }

  const slug = await getUniqueCaseSlug(String(discovered.title));

  // 1. Create the corruption case
  const { data: caseRow, error: caseError } = await supabase
    .from('corruption_cases')
    .insert({
      slug,
      title: String(discovered.title),
      summary: String(discovered.summary || ''),
      corruption_type: String(discovered.corruption_type || 'other'),
      status: String(discovered.status || 'alleged'),
      severity: String(discovered.severity || 'major') as Severity,
      estimated_amount_npr: typeof discovered.estimated_amount_npr === 'number'
        ? discovered.estimated_amount_npr
        : null,
      source_quality: 'reported',
      tags: Array.isArray(discovered.tags) ? discovered.tags as string[] : [],
    })
    .select('id')
    .single();

  if (caseError || !caseRow) {
    throw new Error(caseError?.message || 'Failed to create corruption case');
  }

  const caseId = caseRow.id as string;

  // 2. Create entities + case_entity links
  const entities = Array.isArray(discovered.entities) ? discovered.entities : [];
  for (const entity of entities as Array<Record<string, unknown>>) {
    const entitySlug = slugify(String(entity.name || 'unknown'));
    if (!entitySlug) continue;

    // Upsert entity (may already exist from another case)
    const { data: existingEntity } = await supabase
      .from('corruption_entities')
      .select('id')
      .eq('slug', entitySlug)
      .maybeSingle();

    let entityId: string;

    if (existingEntity) {
      entityId = existingEntity.id as string;
    } else {
      const { data: newEntity, error: entityError } = await supabase
        .from('corruption_entities')
        .insert({
          slug: entitySlug,
          name: String(entity.name),
          entity_type: String(entity.entity_type || 'person'),
          title: entity.title ? String(entity.title) : null,
          party_affiliation: entity.party_affiliation
            ? String(entity.party_affiliation)
            : null,
        })
        .select('id')
        .single();

      if (entityError || !newEntity) {
        console.error(
          `[Corruption Discovery] Failed to create entity ${entity.name}:`,
          entityError,
        );
        continue;
      }

      entityId = newEntity.id as string;
    }

    // Link entity to case
    await supabase.from('corruption_case_entities').insert({
      case_id: caseId,
      entity_id: entityId,
      role: String(entity.role || 'accused'),
    });
  }

  // 3. Create evidence linking the signal
  await supabase.from('corruption_evidence').insert({
    case_id: caseId,
    evidence_type: 'intelligence_signal' as EvidenceType,
    title: signal.title as string,
    url: signal.url as string,
    source_name: signal.source_id as string,
    content_summary: String(discovered.summary || ''),
    published_at: signal.published_at || new Date().toISOString(),
    reliability: 'medium' as EvidenceReliability,
    signal_id: signalId,
  });

  // 4. Create initial timeline event
  await supabase.from('corruption_timeline_events').insert({
    case_id: caseId,
    event_date: signal.published_at
      ? new Date(signal.published_at as string).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    event_date_precision: 'exact' as DatePrecision,
    event_type: 'allegation' as TimelineEventType,
    title: `Case reported: ${String(discovered.title)}`,
  });

  // 5. Update signal metadata
  await supabase
    .from('intelligence_signals')
    .update({
      review_required: false,
      review_status: 'approved',
      metadata: {
        ...metadata,
        corruption_discovery_status: 'approved',
        corruption_discovery_reviewed_at: new Date().toISOString(),
        corruption_discovery_reviewed_by: options?.reviewedBy || 'admin',
        corruption_case_id: caseId,
      },
    })
    .eq('id', signalId);

  await recordSignalReviewAudit({
    signalId,
    action: 'approved',
    reviewer: options?.reviewedBy || 'admin',
    notes: `Corruption discovery approved as case ${caseId}`,
  });

  return { caseId };
}

/**
 * Reject a corruption discovery -- marks it so it won't appear
 * in the review queue again.
 */
export async function rejectCorruptionDiscovery(
  signalId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { data: signal } = await supabase
    .from('intelligence_signals')
    .select('metadata')
    .eq('id', signalId)
    .single();

  if (!signal) throw new Error(`Signal ${signalId} not found`);

  const metadata = (signal.metadata as Record<string, unknown>) || {};

  await supabase
    .from('intelligence_signals')
    .update({
      review_required: false,
      review_status: 'rejected',
      metadata: {
        ...metadata,
        corruption_discovery_status: 'rejected',
        corruption_discovery_reviewed_at: new Date().toISOString(),
      },
    })
    .eq('id', signalId);

  await recordSignalReviewAudit({
    signalId,
    action: 'rejected',
    reviewer: 'admin',
    notes: 'Corruption discovery rejected',
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalToCorruptionDiscovery(
  row: Record<string, unknown>,
): CorruptionDiscovery {
  const meta = (row.metadata as Record<string, unknown>) || {};
  const corruption = (meta.discovered_corruption as Record<string, unknown>) || {};

  return {
    signalId: row.id as string,
    signalTitle: row.title as string,
    signalUrl: row.url as string,
    publishedAt: (row.published_at as string) || null,
    confidence: (meta.corruption_discovery_confidence as number) || 0,
    confidenceLevel:
      (meta.corruption_discovery_confidence_level as 'high' | 'medium' | 'low') ||
      'low',
    reasoning: (meta.corruption_discovery_reasoning as string) || '',
    corruption: {
      title: (corruption.title as string) || '',
      corruption_type: (corruption.corruption_type as CorruptionType) || 'other',
      severity: (corruption.severity as Severity) || 'major',
      estimated_amount_npr: (corruption.estimated_amount_npr as number) || null,
      summary: (corruption.summary as string) || '',
      entities: (corruption.entities as DiscoveredEntity[]) || [],
      source_urls: (corruption.source_urls as string[]) || [],
      status: (corruption.status as CaseStatus) || 'alleged',
      tags: (corruption.tags as string[]) || [],
    },
    status:
      (meta.corruption_discovery_status as CorruptionDiscovery['status']) ||
      'pending',
    discoveredAt: (meta.corruption_discovered_at as string) || '',
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
