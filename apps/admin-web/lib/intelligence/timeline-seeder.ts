/**
 * Timeline Seeder — AI batch job to assign complexity timelines to all commitments.
 *
 * Uses the knowledge base to understand each commitment's complexity, political
 * context, and dependencies, then asks AI to assign:
 * - complexity tier (quick-win / medium / long-term / structural)
 * - expected start day and completion day
 * - start and completion milestones
 * - rationale for the timeline
 *
 * Estimated cost: ~$0.50 for all 109 commitments (batches of 10).
 * Run once, then admin can override individual timelines.
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE, type PromiseKnowledge } from './knowledge-base';
import { clearTimelineCache } from './time-adjusted-score';
import type { ComplexityTier, CommitmentTimeline } from './commitment-timeline';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface AITimelineResponse {
  commitmentId: number;
  complexityTier: ComplexityTier;
  expectedStartByDay: number;
  expectedCompletionByDay: number;
  startMilestones: string[];
  completionMilestones: string[];
  rationale: string;
}

interface SeederResult {
  total: number;
  seeded: number;
  skipped: number;
  failed: number;
  errors: string[];
  model: string;
  costUsd: number;
}

/* ═══════════════════════════════════════════════
   SYSTEM PROMPT
   ═══════════════════════════════════════════════ */

const SYSTEM_PROMPT = `You are a political timeline analyst for Nepal. You analyze government commitments and assign realistic timelines based on political complexity, institutional capacity, and historical patterns in Nepal.

You will be given a batch of government commitments. For each, assign:
1. **complexityTier**: How complex is this commitment?
   - "quick-win": Can be done by executive order, policy directive, or simple administrative action. No legislation needed. Examples: forming a committee, issuing a directive, making an appointment. Expected completion: 1-30 days.
   - "medium": Requires coordination across departments, budget allocation, or regulatory changes. Examples: policy reform, launching a program, changing procurement rules. Expected completion: 30-180 days.
   - "long-term": Requires legislation, major infrastructure, or multi-year implementation. Examples: building roads, constitutional amendments, education reform. Expected completion: 180-365 days.
   - "structural": Fundamental institutional reform requiring years of sustained effort. Examples: federalism implementation, tax system overhaul, judicial reform. Expected completion: 365-730+ days.

2. **expectedStartByDay**: By which day in office should we see the FIRST concrete action (not just talk)?
   - For quick-wins: 1-7 days
   - For medium: 7-45 days
   - For long-term: 14-90 days
   - For structural: 30-120 days

3. **expectedCompletionByDay**: By which day should this be SUBSTANTIALLY delivered?
   - Be realistic about Nepal's institutional pace
   - Consider monsoon season delays (June-September)
   - Consider budget cycle (mid-July fiscal year start)
   - Consider that coalition politics often slow things down

4. **startMilestones**: 2-3 concrete signs that work has BEGUN (e.g., "Committee formed", "Budget line item created", "Bill drafted")

5. **completionMilestones**: 2-3 concrete signs that the commitment is DELIVERED (e.g., "Law enacted", "Infrastructure operational", "Policy in effect")

6. **rationale**: Brief explanation of why you chose this timeline, referencing Nepal-specific factors.

IMPORTANT CONTEXT:
- This is the RSP (Rastriya Swatantra Party) government led by PM Balen Shah, sworn in March 26, 2026.
- This is a coalition government, so politically complex items face coalition negotiation.
- Nepal's bureaucracy is slower than average — factor in institutional inertia.
- The government has 109 tracked commitments across governance, economy, social sectors, and infrastructure.
- Day 1 = March 26, 2026. The first 100 days is a critical evaluation window.

Respond with a JSON array of timeline objects, one per commitment:
[{
  "commitmentId": number,
  "complexityTier": "quick-win" | "medium" | "long-term" | "structural",
  "expectedStartByDay": number,
  "expectedCompletionByDay": number,
  "startMilestones": ["string", "string"],
  "completionMilestones": ["string", "string"],
  "rationale": "brief explanation"
}]`;

/* ═══════════════════════════════════════════════
   BATCH PROCESSING
   ═══════════════════════════════════════════════ */

function formatCommitmentForAI(knowledge: PromiseKnowledge): string {
  return `ID: ${knowledge.id}
Title: ${knowledge.title} (${knowledge.titleNe})
Category: ${knowledge.category}
Description: ${knowledge.description}
Key Aspects: ${knowledge.keyAspects}
Progress Indicators: ${knowledge.progressIndicators}
Stall Indicators: ${knowledge.stallIndicators}
Key Officials: ${knowledge.keyOfficials.join(', ')}
Key Ministries: ${knowledge.keyMinistries.join(', ')}
Budget Relevance: ${knowledge.budgetRelevance}
${knowledge.currentStatus ? `Current Status: ${knowledge.currentStatus}` : ''}`;
}

async function seedBatch(
  batch: PromiseKnowledge[],
): Promise<{ timelines: AITimelineResponse[]; model: string; costUsd: number }> {
  const userPrompt = `Analyze these ${batch.length} government commitments and assign timelines:

${batch.map((k) => formatCommitmentForAI(k)).join('\n\n---\n\n')}

Respond with a JSON array of ${batch.length} timeline objects.`;

  const response = await aiComplete('reason', SYSTEM_PROMPT, userPrompt);

  // Parse JSON from response
  const jsonMatch = response.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a valid JSON array');
  }

  const parsed = JSON.parse(jsonMatch[0]) as AITimelineResponse[];

  // Validate and sanitize
  const validated: AITimelineResponse[] = [];
  for (const item of parsed) {
    if (!item.commitmentId || !item.complexityTier) continue;

    // Ensure valid tier
    const validTiers: ComplexityTier[] = ['quick-win', 'medium', 'long-term', 'structural'];
    if (!validTiers.includes(item.complexityTier)) continue;

    // Ensure reasonable day values
    const startBy = Math.max(1, Math.min(365, item.expectedStartByDay || 30));
    const completeBy = Math.max(startBy + 7, Math.min(1825, item.expectedCompletionByDay || 180));

    validated.push({
      ...item,
      expectedStartByDay: startBy,
      expectedCompletionByDay: completeBy,
      startMilestones: Array.isArray(item.startMilestones) ? item.startMilestones.slice(0, 5) : [],
      completionMilestones: Array.isArray(item.completionMilestones) ? item.completionMilestones.slice(0, 5) : [],
      rationale: item.rationale || 'AI-assigned timeline',
    });
  }

  return { timelines: validated, model: response.model, costUsd: response.costUsd };
}

/* ═══════════════════════════════════════════════
   MAIN SEEDER
   ═══════════════════════════════════════════════ */

export async function seedTimelines(options: {
  /** Only seed these specific IDs (default: all 109) */
  commitmentIds?: number[];
  /** Skip commitments that already have timelines */
  skipExisting?: boolean;
  /** Batch size for AI calls */
  batchSize?: number;
} = {}): Promise<SeederResult> {
  const { commitmentIds, skipExisting = true, batchSize = 10 } = options;
  const supabase = getSupabase();

  const result: SeederResult = {
    total: 0,
    seeded: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    model: '',
    costUsd: 0,
  };

  // Determine which commitments to seed
  let knowledgeEntries = PROMISES_KNOWLEDGE;
  if (commitmentIds && commitmentIds.length > 0) {
    const idSet = new Set(commitmentIds);
    knowledgeEntries = knowledgeEntries.filter((k) => idSet.has(k.id));
  }

  // Check existing timelines
  if (skipExisting) {
    const { data: existing } = await supabase
      .from('commitment_timelines')
      .select('commitment_id')
      .eq('admin_override', false);

    const existingIds = new Set((existing || []).map((r) => r.commitment_id));
    const before = knowledgeEntries.length;
    knowledgeEntries = knowledgeEntries.filter((k) => !existingIds.has(k.id));
    result.skipped = before - knowledgeEntries.length;
  }

  result.total = knowledgeEntries.length + result.skipped;

  if (knowledgeEntries.length === 0) {
    console.log('[TimelineSeeder] All commitments already have timelines. Nothing to seed.');
    return result;
  }

  console.log(`[TimelineSeeder] Seeding timelines for ${knowledgeEntries.length} commitments in batches of ${batchSize}...`);

  // Process in batches
  for (let i = 0; i < knowledgeEntries.length; i += batchSize) {
    const batch = knowledgeEntries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(knowledgeEntries.length / batchSize);

    console.log(`[TimelineSeeder] Batch ${batchNum}/${totalBatches} (${batch.length} commitments)...`);

    try {
      const { timelines, model, costUsd } = await seedBatch(batch);
      result.model = model;
      result.costUsd += costUsd;

      // Upsert into database
      for (const timeline of timelines) {
        try {
          const { error } = await supabase
            .from('commitment_timelines')
            .upsert({
              commitment_id: timeline.commitmentId,
              complexity_tier: timeline.complexityTier,
              expected_start_by_day: timeline.expectedStartByDay,
              expected_completion_by_day: timeline.expectedCompletionByDay,
              start_milestones: timeline.startMilestones,
              completion_milestones: timeline.completionMilestones,
              rationale: timeline.rationale,
              generated_at: new Date().toISOString(),
              generated_by_model: model,
              admin_override: false,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'commitment_id' });

          if (error) {
            result.errors.push(`Commitment ${timeline.commitmentId}: DB error — ${error.message}`);
            result.failed++;
          } else {
            result.seeded++;
          }
        } catch (err) {
          result.errors.push(`Commitment ${timeline.commitmentId}: ${err instanceof Error ? err.message : 'unknown'}`);
          result.failed++;
        }
      }

      // Check for commitments in batch that AI didn't return
      const returnedIds = new Set(timelines.map((t) => t.commitmentId));
      for (const k of batch) {
        if (!returnedIds.has(k.id)) {
          result.errors.push(`Commitment ${k.id}: AI did not return a timeline`);
          result.failed++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      result.errors.push(`Batch ${batchNum} failed: ${msg}`);
      result.failed += batch.length;
      console.error(`[TimelineSeeder] Batch ${batchNum} failed: ${msg}`);
    }

    // Rate limit between batches
    if (i + batchSize < knowledgeEntries.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Clear the timeline cache so scoring engine picks up new data
  clearTimelineCache();

  console.log(
    `[TimelineSeeder] Complete: ${result.seeded} seeded, ${result.skipped} skipped, ${result.failed} failed. ` +
    `Model: ${result.model}, Cost: $${result.costUsd.toFixed(4)}`,
  );

  return result;
}
