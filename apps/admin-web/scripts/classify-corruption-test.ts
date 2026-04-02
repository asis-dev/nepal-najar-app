#!/usr/bin/env npx tsx
/**
 * Corruption Classification — with Nepal filter + dedup + auto-approve
 *
 * 1. Filters out non-Nepal articles before wasting AI calls
 * 2. Classifies via AI (extracts case details, entities, amounts)
 * 3. Groups duplicate articles about the same case
 * 4. Auto-approves high-confidence cases into corruption_cases table
 *
 * Usage:
 *   npx tsx scripts/classify-corruption-test.ts                 # 50 from last 2 months
 *   npx tsx scripts/classify-corruption-test.ts --limit 100     # custom limit
 *   npx tsx scripts/classify-corruption-test.ts --all           # all unprocessed
 *   npx tsx scripts/classify-corruption-test.ts --dry-run       # preview only
 *   npx tsx scripts/classify-corruption-test.ts --no-approve    # classify but don't create cases
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const NO_APPROVE = process.argv.includes('--no-approve');
const ALL = process.argv.includes('--all');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx !== -1 ? Number(process.argv[idx + 1]) || 50 : ALL ? 9999 : 50;
})();

const TWO_MONTHS_AGO = new Date();
TWO_MONTHS_AGO.setMonth(TWO_MONTHS_AGO.getMonth() - 2);

// ── Nepal Filter ──────────────────────────────────────────────────────────
// Hard reject articles that are clearly about India, not Nepal

const INDIA_INDICATORS = [
  'CBI arrests', 'CBI court', 'MCD ', 'Trinamool', 'BJP ', 'Congress MLA',
  'Jalgaon', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Gujarat',
  'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Andhra Pradesh', 'Telangana',
  'Thalapathy', 'Bollywood', 'Mumbai police', 'Delhi police', 'ED probe India',
  'Enforcement Directorate', 'Lok Sabha', 'Rajya Sabha', 'SEBI',
  'Neelankarai', 'TVK chief', 'Ponguleti', 'Reddy\'s involvement',
  'FCRA Bill', 'Kiren Rijiju', 'Hindusthan',
  'Myawaddy', 'DKBA', 'Myanmar', 'mizzima',
];

const NEPAL_INDICATORS = [
  'nepal', 'kathmandu', 'ciaa', 'अख्तियार', 'नेपाल', 'pokhara', 'biratnagar',
  'birgunj', 'nepalgunj', 'dhangadhi', 'janakpur', 'butwal', 'hetauda',
  'bharatpur', 'lalitpur', 'bhaktapur', 'chitwan', 'kaski', 'rupandehi',
  'sunsari', 'morang', 'jhapa', 'kailali', 'banke',
  'rautahat', 'myrepublica', 'himalayan times', 'kathmandu post',
  'khabarhub', 'setopati', 'ekantipur', 'ratopati', 'onlinekhabar',
  'nepali times', 'annapurna express', 'rising nepal', 'nepal news',
  'nepal khabar', 'sanghu', 'samachar',
  'oli', 'deuba', 'dahal', 'prachanda', 'balen', 'shah',
  'maoist', 'uml', 'rsp', 'congress nepal',
  'npr ', 'crore', 'करोड', 'अर्ब', 'लाख',
  'province', 'pradesh', 'प्रदेश',
];

function isLikelyNepal(title: string, url: string, snippet: string): boolean {
  const text = `${title} ${url} ${snippet}`.toLowerCase();

  // Hard reject India/Myanmar signals
  for (const indicator of INDIA_INDICATORS) {
    if (text.includes(indicator.toLowerCase())) {
      // But allow if it ALSO mentions Nepal
      const hasNepal = NEPAL_INDICATORS.some(n => text.includes(n.toLowerCase()));
      if (!hasNepal) return false;
    }
  }

  // Must have at least one Nepal indicator
  return NEPAL_INDICATORS.some(n => text.includes(n.toLowerCase()));
}

// ── Case Deduplication ────────────────────────────────────────────────────

interface ClassifiedCase {
  title: string;
  type: string;
  severity: string;
  amount: number | null;
  amountLabel: string;
  status: string;
  summary: string;
  summaryNe: string;
  entities: Array<{ name: string; entity_type: string; role: string; title?: string; party_affiliation?: string }>;
  tags: string[];
  confidence: number;
  signalIds: string[];
  sourceUrls: string[];
  latestDate: string;
  accountabilityStatus: string;
  nextExpected: string;
}

// Map AI statuses to valid DB statuses
const STATUS_MAP: Record<string, string> = {
  'in_custody': 'charged',
  'arrested': 'charged',
  'detained': 'charged',
  'bail': 'charged',
  'investigation': 'under_investigation',
  'probe': 'under_investigation',
  'fraud': 'alleged',
};
const VALID_STATUSES = ['alleged', 'under_investigation', 'charged', 'trial', 'convicted', 'acquitted', 'asset_recovery', 'closed'];

function normalizeStatus(status: string): string {
  if (VALID_STATUSES.includes(status)) return status;
  return STATUS_MAP[status] || 'alleged';
}

function normalizeForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/\b(case|probe|investigation|scandal|nepal|nepal's|former|corruption|against|arrest|of|the|a|an|in)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function extractKeyEntities(c: ClassifiedCase): string[] {
  return c.entities
    .filter(e => e.role === 'accused' && e.name.length > 3 && !e.name.toLowerCase().includes('unknown') && !e.name.toLowerCase().includes('unnamed'))
    .map(e => e.name.toLowerCase().trim());
}

function areSameCase(a: ClassifiedCase, b: ClassifiedCase): boolean {
  // Title-based matching
  const na = normalizeForDedup(a.title);
  const nb = normalizeForDedup(b.title);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length > 10) return true;

  // Entity-based matching — if same accused people, same case
  const entitiesA = extractKeyEntities(a);
  const entitiesB = extractKeyEntities(b);
  if (entitiesA.length > 0 && entitiesB.length > 0) {
    const overlap = entitiesA.filter(ea => entitiesB.some(eb => ea.includes(eb) || eb.includes(ea)));
    if (overlap.length > 0) return true;
  }

  // Type + title word overlap
  if (a.type === b.type) {
    const wordsA = new Set(na.match(/[a-z]{4,}/g) || []);
    const wordsB = new Set(nb.match(/[a-z]{4,}/g) || []);
    const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
    const minSize = Math.min(wordsA.size, wordsB.size);
    if (minSize > 0 && overlap / minSize >= 0.5) return true;
  }

  return false;
}

function mergeIntoCases(
  rawCases: Array<ClassifiedCase>,
): ClassifiedCase[] {
  const merged: ClassifiedCase[] = [];

  for (const raw of rawCases) {
    const existing = merged.find(m => areSameCase(m, raw));
    if (existing) {
      // Accumulate signals and URLs
      existing.signalIds.push(...raw.signalIds);
      existing.sourceUrls.push(...raw.sourceUrls);

      // Prefer the version with named entities over "Unknown"
      const existingHasNames = extractKeyEntities(existing).length > 0;
      const rawHasNames = extractKeyEntities(raw).length > 0;

      if (rawHasNames && !existingHasNames) {
        // Raw has real names, existing doesn't — swap title/summary
        existing.title = raw.title;
        existing.summary = raw.summary;
        existing.summaryNe = raw.summaryNe;
      } else if (raw.confidence > existing.confidence) {
        existing.title = raw.title;
        existing.summary = raw.summary || existing.summary;
        existing.summaryNe = raw.summaryNe || existing.summaryNe;
      }

      // Take the highest confidence
      existing.confidence = Math.max(existing.confidence, raw.confidence);

      // Take the most severe severity
      const severityRank = { minor: 1, major: 2, mega: 3 };
      if ((severityRank[raw.severity as keyof typeof severityRank] || 0) > (severityRank[existing.severity as keyof typeof severityRank] || 0)) {
        existing.severity = raw.severity;
      }

      // Take any non-empty accountability/status info
      existing.accountabilityStatus = existing.accountabilityStatus || raw.accountabilityStatus;
      existing.nextExpected = existing.nextExpected || raw.nextExpected;
      if (raw.status && raw.status !== 'alleged' && existing.status === 'alleged') {
        existing.status = raw.status;
      }

      // Take amount if we find one
      if (raw.amount && (!existing.amount || raw.amount > existing.amount)) {
        existing.amount = raw.amount;
        existing.amountLabel = raw.amountLabel;
      }

      // Merge entities — prefer named over "Unknown", dedup by lowercase name
      const entityMap = new Map<string, typeof raw.entities[0]>();
      for (const e of [...existing.entities, ...raw.entities]) {
        const key = e.name.toLowerCase().trim();
        if (key.includes('unknown') || key.includes('unnamed') || key.length < 3) continue;
        if (!entityMap.has(key)) {
          entityMap.set(key, e);
        } else {
          // Merge: keep the one with more info
          const prev = entityMap.get(key)!;
          if (e.title && !prev.title) entityMap.set(key, { ...prev, title: e.title });
          if (e.party_affiliation && !prev.party_affiliation) entityMap.set(key, { ...prev, party_affiliation: e.party_affiliation });
        }
      }
      existing.entities = [...entityMap.values()];

      // Merge tags
      existing.tags = [...new Set([...existing.tags, ...raw.tags])];
      // Latest date
      if (raw.latestDate > existing.latestDate) existing.latestDate = raw.latestDate;
    } else {
      merged.push({ ...raw });
    }
  }

  // Clean up: remove "Unknown" entities from all cases, dedup URLs
  for (const c of merged) {
    c.sourceUrls = [...new Set(c.sourceUrls)];
    c.signalIds = [...new Set(c.signalIds)];
    c.entities = c.entities.filter(e =>
      !e.name.toLowerCase().includes('unknown') &&
      !e.name.toLowerCase().includes('unnamed') &&
      e.name.length > 2
    );
  }

  return merged;
}

/**
 * AI consolidation pass — for cases with 3+ articles, ask AI to produce
 * one clean combined summary using info from all source articles.
 */
async function aiConsolidateCases(
  cases: ClassifiedCase[],
): Promise<ClassifiedCase[]> {
  const casesNeedingConsolidation = cases.filter(c => c.signalIds.length >= 3);
  if (casesNeedingConsolidation.length === 0) return cases;

  console.log(`\n  AI consolidation for ${casesNeedingConsolidation.length} cases with 3+ articles...`);

  let aiModule: any;
  try {
    aiModule = await import('../lib/intelligence/ai-router');
  } catch {
    console.warn('  Could not load AI router, skipping consolidation');
    return cases;
  }

  for (const c of casesNeedingConsolidation) {
    // Get all signal titles for this case
    const { data: signalData } = await supabase
      .from('intelligence_signals')
      .select('title, content_summary, published_at, url')
      .in('id', c.signalIds)
      .order('published_at', { ascending: false });

    if (!signalData || signalData.length < 2) continue;

    const articlesContext = signalData.map((s: any, i: number) =>
      `Article ${i + 1} (${s.published_at?.slice(0, 10) || '?'}): ${s.title}\n  ${(s.content_summary || '').slice(0, 200)}`
    ).join('\n');

    const prompt = `You have ${signalData.length} news articles about the SAME corruption case in Nepal.
Current case title: "${c.title}"
Current summary: "${c.summary}"
Current entities: ${c.entities.map(e => `${e.name} (${e.role})`).join(', ')}

Articles:
${articlesContext}

Combine ALL information into ONE definitive case entry. Extract:
1. Best case title (clear, specific, with full names)
2. Combined summary — one clear sentence with WHO did WHAT
3. Combined summary in Nepali
4. All named people with full names and titles
5. Estimated amount if mentioned in any article
6. Current accountability status (who is in jail, who is out, what's next)

Respond JSON ONLY:
{
  "title": "definitive case title",
  "summary": "combined plain-language summary",
  "summary_ne": "same in simple Nepali",
  "entities": [{"name":"Full Name","entity_type":"person|politician|official","role":"accused|investigator|witness","title":"position","party_affiliation":"party or null"}],
  "estimated_amount_npr": number or null,
  "accountability_status": "who is in jail, who is free, what's next",
  "severity": "minor|major|mega"
}`;

    try {
      const result = await aiModule.aiComplete('extract',
        'You are a Nepali anti-corruption analyst. Combine multiple news articles about the same case into one definitive entry.',
        prompt
      );
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) c.title = parsed.title;
        if (parsed.summary) c.summary = parsed.summary;
        if (parsed.summary_ne) c.summaryNe = parsed.summary_ne;
        if (parsed.accountability_status) c.accountabilityStatus = parsed.accountability_status;
        if (parsed.severity) c.severity = parsed.severity;
        if (parsed.estimated_amount_npr) c.amount = parsed.estimated_amount_npr;
        if (Array.isArray(parsed.entities) && parsed.entities.length > 0) {
          c.entities = parsed.entities.filter((e: any) =>
            e.name && !e.name.toLowerCase().includes('unknown') && e.name.length > 2
          );
        }
        process.stdout.write('M');
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.warn(`  AI consolidation failed for "${c.title}": ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log('');

  return cases;
}

// ── Auto-Approve into corruption_cases ────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function createCorruptionCase(c: ClassifiedCase): Promise<string | null> {
  const slug = slugify(c.title);

  // Check if case already exists
  const { data: existing } = await supabase
    .from('corruption_cases')
    .select('id, slug')
    .or(`slug.eq.${slug},title.ilike.%${c.title.slice(0, 30)}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`    ⏭️  Already exists: ${existing[0].slug}`);
    // Still link signals to existing case
    for (const signalId of c.signalIds) {
      await supabase.from('intelligence_signals').update({
        tier1_processed: true,
        classification: 'confirms',
        relevance_score: c.confidence,
        metadata: {
          corruption_case_id: existing[0].id,
          corruption_discovery_status: 'approved',
        },
      }).eq('id', signalId);
    }
    return existing[0].id;
  }

  // Create the case
  const { data: caseRow, error: caseError } = await supabase
    .from('corruption_cases')
    .insert({
      slug,
      title: c.title,
      summary: c.summary,
      summary_ne: c.summaryNe || null,
      corruption_type: c.type || 'other',
      status: normalizeStatus(c.status || 'alleged'),
      severity: c.severity || 'major',
      estimated_amount_npr: c.amount,
      source_quality: 'reported',
      tags: c.tags,
    })
    .select('id')
    .single();

  if (caseError || !caseRow) {
    console.error(`    ❌ Failed to create case: ${caseError?.message}`);
    return null;
  }

  const caseId = caseRow.id;

  // Create entities
  for (const entity of c.entities) {
    const entitySlug = slugify(entity.name);
    if (!entitySlug || entitySlug.length < 2) continue;

    const { data: existingEntity } = await supabase
      .from('corruption_entities')
      .select('id')
      .eq('slug', entitySlug)
      .maybeSingle();

    let entityId: string;

    if (existingEntity) {
      entityId = existingEntity.id;
    } else {
      const { data: newEntity, error: entityError } = await supabase
        .from('corruption_entities')
        .insert({
          slug: entitySlug,
          name: entity.name,
          entity_type: entity.entity_type || 'person',
          title: entity.title || null,
          party_affiliation: entity.party_affiliation || null,
        })
        .select('id')
        .single();

      if (entityError || !newEntity) continue;
      entityId = newEntity.id;
    }

    await supabase.from('corruption_case_entities').insert({
      case_id: caseId,
      entity_id: entityId,
      role: entity.role || 'accused',
    });
  }

  // Create evidence entries for each source URL
  for (const signalId of c.signalIds) {
    const { data: signal } = await supabase
      .from('intelligence_signals')
      .select('title, url, published_at, source_id')
      .eq('id', signalId)
      .single();

    if (signal) {
      await supabase.from('corruption_evidence').insert({
        case_id: caseId,
        evidence_type: 'intelligence_signal',
        title: signal.title,
        url: signal.url,
        source_name: signal.source_id,
        content_summary: c.summary,
        published_at: signal.published_at || new Date().toISOString(),
        reliability: c.confidence >= 0.8 ? 'high' : 'medium',
        signal_id: signalId,
      });
    }

    // Mark signal as processed
    await supabase.from('intelligence_signals').update({
      tier1_processed: true,
      classification: 'confirms',
      relevance_score: c.confidence,
      metadata: {
        corruption_case_id: caseId,
        corruption_discovery_status: 'approved',
      },
    }).eq('id', signalId);
  }

  // Timeline event
  await supabase.from('corruption_timeline_events').insert({
    case_id: caseId,
    event_date: c.latestDate ? new Date(c.latestDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    event_date_precision: 'exact',
    event_type: c.status === 'convicted' ? 'verdict' : c.status === 'in_custody' ? 'arrest' : 'allegation',
    title: `Case reported: ${c.title}`,
  });

  return caseId;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  Nepal Republic — Corruption Classification');
  console.log('  ============================================');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Auto-approve: ${NO_APPROVE ? 'NO' : 'YES'}`);
  console.log(`  Limit: ${ALL ? 'ALL' : LIMIT}`);
  console.log(`  Date range: ${ALL ? 'all time' : TWO_MONTHS_AGO.toISOString().slice(0, 10) + ' → now'}`);
  console.log('');

  // Fetch unprocessed signals
  let query = supabase
    .from('intelligence_signals')
    .select('id, title, content_summary, url, source_id, signal_type, published_at, metadata')
    .eq('source_id', 'corruption-sweep')
    .eq('tier1_processed', false)
    .order('published_at', { ascending: false })
    .limit(LIMIT);

  if (!ALL) {
    query = query.gte('published_at', TWO_MONTHS_AGO.toISOString());
  }

  const { data: signals, error } = await query;

  if (error) {
    console.error('  Failed to fetch:', error.message);
    process.exit(1);
  }

  console.log(`  Found ${signals?.length || 0} unprocessed signals`);

  if (!signals || signals.length === 0) {
    console.log('  Nothing to classify.');
    return;
  }

  // Step 1: Nepal filter
  const nepalSignals: typeof signals = [];
  const rejectedNonNepal: string[] = [];

  for (const s of signals) {
    const snippet = (s.content_summary || '') + ' ' + ((s.metadata as any)?.original_source || '');
    if (isLikelyNepal(s.title, s.url, snippet)) {
      nepalSignals.push(s);
    } else {
      rejectedNonNepal.push(s.title.slice(0, 70));
      // Mark as processed so we don't retry
      if (!DRY_RUN) {
        await supabase.from('intelligence_signals').update({
          tier1_processed: true,
          classification: 'unrelated',
          relevance_score: 0.1,
        }).eq('id', s.id);
      }
    }
  }

  console.log(`  Nepal filter: ${nepalSignals.length} pass, ${rejectedNonNepal.length} rejected`);
  if (rejectedNonNepal.length > 0) {
    console.log('  Rejected (not Nepal):');
    for (const t of rejectedNonNepal.slice(0, 10)) {
      console.log(`    ✗ ${t}`);
    }
    if (rejectedNonNepal.length > 10) console.log(`    ... and ${rejectedNonNepal.length - 10} more`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('  Would classify:');
    for (const s of nepalSignals) {
      console.log(`    ✓ ${s.title.slice(0, 80)}`);
    }
    return;
  }

  // Step 2: AI classification
  const { analyzeCorruptionSignal, hasCorruptionLanguage } = await import(
    '../lib/intelligence/corruption-discovery'
  );

  let classified = 0;
  let notCorruption = 0;
  let failed = 0;
  const rawCases: ClassifiedCase[] = [];

  for (const signal of nepalSignals) {
    const signalForAnalysis = {
      id: signal.id,
      source_id: signal.source_id,
      signal_type: signal.signal_type,
      title: signal.title,
      content: signal.content_summary || null,
      url: signal.url,
      published_at: signal.published_at,
      author: null,
      media_type: null,
      metadata: signal.metadata || {},
    };

    if (!hasCorruptionLanguage(signalForAnalysis)) {
      await supabase.from('intelligence_signals').update({
        tier1_processed: true,
        classification: 'related',
        relevance_score: 0.3,
      }).eq('id', signal.id);
      notCorruption++;
      process.stdout.write('.');
      classified++;
      continue;
    }

    try {
      const result = await analyzeCorruptionSignal(signalForAnalysis);

      if (result && result.isCorruptionCase && result.corruption) {
        const c = result.corruption as any;
        rawCases.push({
          title: c.title || signal.title,
          type: c.corruption_type || 'other',
          severity: c.severity || 'major',
          amount: typeof c.estimated_amount_npr === 'number' ? c.estimated_amount_npr : null,
          amountLabel: c.estimated_amount_label || '',
          status: c.status || 'alleged',
          summary: c.summary || '',
          summaryNe: c.summary_ne || '',
          entities: (c.entities || []).map((e: any) => ({
            name: e.name,
            entity_type: e.entity_type || 'person',
            role: e.role || 'accused',
            title: e.title || null,
            party_affiliation: e.party_affiliation || null,
          })),
          tags: c.tags || [],
          confidence: result.confidence,
          signalIds: [signal.id],
          sourceUrls: [signal.url],
          latestDate: signal.published_at || new Date().toISOString(),
          accountabilityStatus: c.accountability_status || '',
          nextExpected: c.next_expected || '',
        });
        process.stdout.write('C');
      } else {
        await supabase.from('intelligence_signals').update({
          tier1_processed: true,
          classification: 'related',
          relevance_score: 0.3,
        }).eq('id', signal.id);
        notCorruption++;
        process.stdout.write('.');
      }
      classified++;
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      failed++;
      process.stdout.write('X');
      console.error(`\n  [ERROR] ${signal.id}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Step 3: Dedup
  console.log('\n');
  let mergedCases = mergeIntoCases(rawCases);

  // Step 3.5: AI consolidation — combine info from multiple articles into one rich entry
  mergedCases = await aiConsolidateCases(mergedCases);

  console.log('  ============================================');
  console.log('  RESULTS');
  console.log('  ============================================');
  console.log(`  Processed: ${classified} signals`);
  console.log(`  Not corruption: ${notCorruption}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Raw cases found: ${rawCases.length}`);
  console.log(`  After dedup: ${mergedCases.length} unique cases`);
  console.log('');

  for (const c of mergedCases) {
    const amountStr = c.amount
      ? c.amount >= 1_000_000_000 ? `NPR ${(c.amount / 1_000_000_000).toFixed(1)} arab`
      : c.amount >= 10_000_000 ? `NPR ${(c.amount / 10_000_000).toFixed(1)} crore`
      : c.amount >= 100_000 ? `NPR ${(c.amount / 100_000).toFixed(1)} lakh`
      : `NPR ${c.amount.toLocaleString()}`
      : c.amountLabel || 'unknown';

    console.log(`  📋 ${c.title}`);
    console.log(`     Type: ${c.type} | Severity: ${c.severity} | Amount: ${amountStr}`);
    console.log(`     Status: ${c.status} | Confidence: ${(c.confidence * 100).toFixed(0)}%`);
    console.log(`     Entities: ${c.entities.map(e => `${e.name} (${e.role})`).join(', ') || 'none'}`);
    console.log(`     Sources: ${c.signalIds.length} articles`);
    if (c.summary) console.log(`     Summary: ${c.summary.slice(0, 120)}`);
    if (c.accountabilityStatus) console.log(`     Accountability: ${c.accountabilityStatus}`);
    console.log('');
  }

  // Step 4: Auto-approve into corruption_cases
  if (!NO_APPROVE && mergedCases.length > 0) {
    console.log('  Creating corruption cases...');
    let created = 0;
    let skipped = 0;

    for (const c of mergedCases) {
      if (c.confidence < 0.5) {
        console.log(`    ⏭️  Skipping low-confidence: ${c.title} (${(c.confidence * 100).toFixed(0)}%)`);
        skipped++;
        continue;
      }

      const caseId = await createCorruptionCase(c);
      if (caseId) {
        console.log(`    ✅ Created: ${c.title} → ${caseId}`);
        created++;
      }
    }

    console.log(`\n  Created ${created} cases, skipped ${skipped} low-confidence`);
  }

  console.log('\n  ============================================');
  console.log('  Done.');
  console.log('  ============================================\n');
}

main().catch(console.error);
