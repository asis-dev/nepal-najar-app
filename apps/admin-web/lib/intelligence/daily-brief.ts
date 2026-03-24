/**
 * Daily Brief Generator for Nepal Najar
 *
 * Generates a daily intelligence summary by aggregating the last 24 hours
 * of signals, grouping by commitment and topic, and using AI to produce
 * English and Nepali summaries.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DailyBrief {
  date: string;                    // YYYY-MM-DD
  pulse: number;                   // 0-100
  pulseLabel: string;              // "calm" | "moderate" | "active" | "very active"
  summaryEn: string;               // 3-5 bullet English summary
  summaryNe: string;               // Nepali translation
  topStories: {
    title: string;
    titleNe?: string;
    summary: string;
    signalCount: number;
    sources: string[];             // which platforms covered it
    relatedCommitments: number[];  // commitment IDs
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  }[];
  commitmentsMoved: {
    commitmentId: number;
    title: string;
    direction: 'confirms' | 'contradicts' | 'new_activity';
    signalCount: number;
    keySignal: string;             // most important signal title
  }[];
  stats: {
    totalSignals24h: number;
    newSignals: number;
    sourcesActive: number;
    topSource: string;
  };
  generatedAt: string;
}

interface RawSignal {
  id: string;
  title: string;
  title_en: string | null;
  url: string;
  source_id: string;
  signal_type: string;
  published_at: string | null;
  discovered_at: string;
  matched_promise_ids: number[] | null;
  relevance_score: number | null;
  classification: string | null;
  extracted_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  content: string | null;
  content_summary: string | null;
  author: string | null;
}

interface AIBriefResponse {
  summaryBullets: string[];
  topStories: {
    title: string;
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    signalIds: string[];
  }[];
  commitmentUpdates: {
    commitmentId: number;
    direction: 'confirms' | 'contradicts' | 'new_activity';
    keyFinding: string;
  }[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'not',
  'no', 'so', 'if', 'than', 'that', 'this', 'it', 'its', 'as', 'also',
  'more', 'some', 'any', 'all', 'most', 'other', 'just', 'only', 'very',
  'how', 'what', 'when', 'where', 'who', 'why', 'nepal', 'nepali',
  'said', 'says', 'government', 'minister', 'according', 'report',
  'new', 'year', 'been', 'being', 'about', 'after', 'before',
  'को', 'मा', 'ले', 'र', 'छ', 'छन्', 'गरेको', 'भएको', 'हुने',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPulseLabel(pulse: number): string {
  if (pulse <= 20) return 'calm';
  if (pulse <= 50) return 'moderate';
  if (pulse <= 75) return 'active';
  return 'very active';
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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

// ── Core: fetch recent signals ───────────────────────────────────────────────

async function fetchRecentSignals(): Promise<RawSignal[]> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - HOURS_24_MS).toISOString();

  const { data, error } = await supabase
    .from('intelligence_signals')
    .select(
      'id, title, title_en, url, source_id, signal_type, published_at, discovered_at, ' +
      'matched_promise_ids, relevance_score, classification, extracted_data, metadata, ' +
      'content, content_summary, author',
    )
    .gte('discovered_at', cutoff)
    .gte('relevance_score', 0.2)
    .order('relevance_score', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[DailyBrief] Failed to fetch signals:', error.message);
    return [];
  }

  return (data || []) as unknown as RawSignal[];
}

// ── Core: group signals by commitment ────────────────────────────────────────

interface CommitmentGroup {
  commitmentId: number;
  signals: RawSignal[];
  topClassification: string | null;
}

function groupByCommitment(signals: RawSignal[]): CommitmentGroup[] {
  const map = new Map<number, RawSignal[]>();

  for (const signal of signals) {
    const ids = signal.matched_promise_ids || [];
    for (const pid of ids) {
      const list = map.get(pid) || [];
      list.push(signal);
      map.set(pid, list);
    }
  }

  return [...map.entries()].map(([commitmentId, sigs]) => {
    // Determine dominant classification
    const classCount = new Map<string, number>();
    for (const s of sigs) {
      if (s.classification) {
        classCount.set(s.classification, (classCount.get(s.classification) || 0) + 1);
      }
    }
    let topClassification: string | null = null;
    let maxCount = 0;
    for (const [cls, count] of classCount) {
      if (count > maxCount) {
        topClassification = cls;
        maxCount = count;
      }
    }

    return { commitmentId, signals: sigs, topClassification };
  }).sort((a, b) => b.signals.length - a.signals.length);
}

// ── Core: group signals by topic keywords ────────────────────────────────────

interface TopicGroup {
  topic: string;
  signals: RawSignal[];
  sources: Set<string>;
  relatedCommitments: Set<number>;
}

function groupByTopic(signals: RawSignal[]): TopicGroup[] {
  const keywordToSignals = new Map<string, Set<string>>();
  const signalMap = new Map<string, RawSignal>();

  for (const signal of signals) {
    signalMap.set(signal.id, signal);
    const text = [signal.title_en || signal.title, signal.content_summary || ''].join(' ');
    const keywords = extractKeywords(text);
    const seen = new Set<string>();

    for (const kw of keywords) {
      if (seen.has(kw)) continue;
      seen.add(kw);
      const ids = keywordToSignals.get(kw) || new Set();
      ids.add(signal.id);
      keywordToSignals.set(kw, ids);
    }
  }

  // Take keywords with 3+ signals
  const topKeywords = [...keywordToSignals.entries()]
    .filter(([, ids]) => ids.size >= 3)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 15);

  const usedSignalIds = new Set<string>();
  const topics: TopicGroup[] = [];

  for (const [keyword, signalIds] of topKeywords) {
    const uncovered = [...signalIds].filter((id) => !usedSignalIds.has(id));
    if (uncovered.length < 2) continue;

    const topicSignals = [...signalIds]
      .map((id) => signalMap.get(id)!)
      .filter(Boolean);

    const sources = new Set<string>();
    const relatedCommitments = new Set<number>();
    for (const s of topicSignals) {
      sources.add(s.source_id);
      for (const pid of s.matched_promise_ids || []) {
        relatedCommitments.add(pid);
      }
    }

    topics.push({
      topic: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      signals: topicSignals,
      sources,
      relatedCommitments,
    });

    for (const id of signalIds) usedSignalIds.add(id);
  }

  return topics;
}

// ── Core: compute stats ──────────────────────────────────────────────────────

function computeStats(signals: RawSignal[]): DailyBrief['stats'] {
  const sourceCount = new Map<string, number>();
  for (const s of signals) {
    sourceCount.set(s.source_id, (sourceCount.get(s.source_id) || 0) + 1);
  }

  let topSource = '';
  let topSourceCount = 0;
  for (const [source, count] of sourceCount) {
    if (count > topSourceCount) {
      topSource = source;
      topSourceCount = count;
    }
  }

  return {
    totalSignals24h: signals.length,
    newSignals: signals.filter((s) => !s.matched_promise_ids || s.matched_promise_ids.length === 0).length,
    sourcesActive: sourceCount.size,
    topSource,
  };
}

// ── Core: compute pulse ──────────────────────────────────────────────────────

function computePulseFromSignals(signals: RawSignal[]): number {
  if (signals.length === 0) return 0;

  // Base pulse from signal volume (log scale, calibrated so ~50 signals/day = 50)
  const volumePulse = Math.min(60, (Math.log1p(signals.length) / Math.log1p(50)) * 50);

  // Source diversity bonus
  const sourceTypes = new Set(signals.map((s) => s.signal_type));
  const diversityBonus = Math.min(15, sourceTypes.size * 3);

  // High-relevance signal bonus
  const highRelevance = signals.filter((s) => (s.relevance_score || 0) >= 0.7).length;
  const relevanceBonus = Math.min(10, highRelevance * 2);

  // Commitment coverage bonus
  const commitmentIds = new Set<number>();
  for (const s of signals) {
    for (const pid of s.matched_promise_ids || []) commitmentIds.add(pid);
  }
  const coverageBonus = Math.min(15, commitmentIds.size * 2);

  return Math.min(100, Math.round(volumePulse + diversityBonus + relevanceBonus + coverageBonus));
}

// ── Core: AI summarization ───────────────────────────────────────────────────

async function generateAISummary(
  signals: RawSignal[],
  commitmentGroups: CommitmentGroup[],
  topicGroups: TopicGroup[],
): Promise<AIBriefResponse | null> {
  // Build context from top 20 most relevant signals
  const topSignals = signals.slice(0, 20);
  const signalContext = topSignals.map((s, i) =>
    `${i + 1}. [${s.signal_type}] "${s.title_en || s.title}" (source: ${s.source_id}, ` +
    `relevance: ${s.relevance_score?.toFixed(2)}, classification: ${s.classification || 'unknown'}, ` +
    `commitments: ${(s.matched_promise_ids || []).join(',') || 'none'})\n` +
    `   Summary: ${s.content_summary || (s.content || '').slice(0, 200)}`
  ).join('\n');

  const commitmentContext = commitmentGroups.slice(0, 10).map((g) =>
    `- Commitment #${g.commitmentId}: ${g.signals.length} signals, dominant classification: ${g.topClassification || 'unknown'}`
  ).join('\n');

  const topicContext = topicGroups.slice(0, 10).map((g) =>
    `- "${g.topic}": ${g.signals.length} signals from ${g.sources.size} sources`
  ).join('\n');

  const systemPrompt = `You are a Nepal political news briefing generator for Nepal Najar, a government promise tracker.
Given signals from the last 24 hours, generate a structured daily brief.

Rules:
1. Generate 3-5 bullet points summarizing the most important political developments
2. For each bullet, identify which government commitment (if any) is affected
3. Note any contradictions or surprising developments
4. Keep it factual, concise, and neutral
5. Identify top stories with sentiment analysis
6. For commitment updates, indicate whether signals confirm, contradict, or show new activity

Respond in JSON format ONLY:
{
  "summaryBullets": ["bullet 1", "bullet 2", ...],
  "topStories": [
    {
      "title": "Story headline",
      "summary": "2-3 sentence summary",
      "sentiment": "positive|negative|neutral|mixed",
      "signalIds": ["id1", "id2"]
    }
  ],
  "commitmentUpdates": [
    {
      "commitmentId": 123,
      "direction": "confirms|contradicts|new_activity",
      "keyFinding": "brief description of what changed"
    }
  ]
}`;

  const userPrompt = `Generate today's daily brief from these signals:

SIGNALS (top 20 by relevance):
${signalContext}

COMMITMENT ACTIVITY:
${commitmentContext || 'No commitment activity detected.'}

TOPIC CLUSTERS:
${topicContext || 'No clear topic clusters detected.'}

Total signals in last 24h: ${signals.length}`;

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    return parseJSON<AIBriefResponse>(response.content);
  } catch (err) {
    console.error('[DailyBrief] AI summary generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function translateToNepali(englishSummary: string): Promise<string> {
  const systemPrompt = `You are a professional translator. Translate the following English text to Nepali (Devanagari script).
Keep it natural and use common Nepali political/news terminology.
Respond with ONLY the translated text, no JSON or explanation.`;

  try {
    const response = await aiComplete('summarize', systemPrompt, englishSummary);
    return response.content.trim();
  } catch (err) {
    console.warn('[DailyBrief] Nepali translation failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

// ── Main: generate daily brief ───────────────────────────────────────────────

export async function generateDailyBrief(): Promise<DailyBrief> {
  const signals = await fetchRecentSignals();
  const commitmentGroups = groupByCommitment(signals);
  const topicGroups = groupByTopic(signals);
  const stats = computeStats(signals);
  const pulse = computePulseFromSignals(signals);
  const pulseLabel = getPulseLabel(pulse);
  const date = todayDateString();

  // Fetch commitment titles for groups
  const supabase = getSupabase();
  const commitmentIds = commitmentGroups.map((g) => g.commitmentId);
  const commitmentTitles = new Map<number, string>();

  if (commitmentIds.length > 0) {
    const { data: commitments } = await supabase
      .from('promises')
      .select('id, title')
      .in('id', commitmentIds);

    if (commitments) {
      for (const c of commitments) {
        commitmentTitles.set(c.id, c.title);
      }
    }
  }

  // Generate AI summary
  const aiSummary = await generateAISummary(signals, commitmentGroups, topicGroups);

  // Build summaryEn from AI or fallback
  let summaryEn: string;
  if (aiSummary?.summaryBullets?.length) {
    summaryEn = aiSummary.summaryBullets.map((b) => `- ${b}`).join('\n');
  } else {
    // Fallback: generate a basic summary from data
    const bullets: string[] = [];
    bullets.push(`${signals.length} intelligence signals collected from ${stats.sourcesActive} sources.`);
    if (commitmentGroups.length > 0) {
      bullets.push(`${commitmentGroups.length} government commitments had new activity.`);
    }
    if (topicGroups.length > 0) {
      bullets.push(`Top topics: ${topicGroups.slice(0, 3).map((t) => t.topic).join(', ')}.`);
    }
    summaryEn = bullets.map((b) => `- ${b}`).join('\n');
  }

  // Translate to Nepali
  const summaryNe = await translateToNepali(summaryEn);

  // Build topStories
  const topStories: DailyBrief['topStories'] = [];

  if (aiSummary?.topStories?.length) {
    for (const story of aiSummary.topStories.slice(0, 5)) {
      // Find matching signals to get sources and commitments
      const matchedSignals = story.signalIds
        ?.map((id) => signals.find((s) => s.id === id))
        .filter(Boolean) as RawSignal[] | undefined;

      const sources = new Set<string>();
      const relatedCommitments = new Set<number>();
      for (const s of matchedSignals || []) {
        sources.add(s.source_id);
        for (const pid of s.matched_promise_ids || []) {
          relatedCommitments.add(pid);
        }
      }

      topStories.push({
        title: story.title,
        summary: story.summary,
        signalCount: story.signalIds?.length || 0,
        sources: [...sources],
        relatedCommitments: [...relatedCommitments],
        sentiment: story.sentiment || 'neutral',
      });
    }
  } else {
    // Fallback: build from topic groups
    for (const group of topicGroups.slice(0, 5)) {
      const topSignal = group.signals[0];
      topStories.push({
        title: group.topic,
        summary: topSignal?.content_summary || topSignal?.title_en || topSignal?.title || '',
        signalCount: group.signals.length,
        sources: [...group.sources],
        relatedCommitments: [...group.relatedCommitments],
        sentiment: 'neutral',
      });
    }
  }

  // Build commitmentsMoved
  const commitmentsMoved: DailyBrief['commitmentsMoved'] = [];

  if (aiSummary?.commitmentUpdates?.length) {
    for (const update of aiSummary.commitmentUpdates) {
      const group = commitmentGroups.find((g) => g.commitmentId === update.commitmentId);
      const keySignal = group?.signals[0];

      commitmentsMoved.push({
        commitmentId: update.commitmentId,
        title: commitmentTitles.get(update.commitmentId) || `Commitment #${update.commitmentId}`,
        direction: update.direction,
        signalCount: group?.signals.length || 0,
        keySignal: keySignal?.title_en || keySignal?.title || update.keyFinding,
      });
    }
  } else {
    // Fallback: build from commitment groups
    for (const group of commitmentGroups.slice(0, 10)) {
      const keySignal = group.signals[0];
      let direction: 'confirms' | 'contradicts' | 'new_activity' = 'new_activity';
      if (group.topClassification === 'confirms') direction = 'confirms';
      else if (group.topClassification === 'contradicts') direction = 'contradicts';

      commitmentsMoved.push({
        commitmentId: group.commitmentId,
        title: commitmentTitles.get(group.commitmentId) || `Commitment #${group.commitmentId}`,
        direction,
        signalCount: group.signals.length,
        keySignal: keySignal?.title_en || keySignal?.title || '',
      });
    }
  }

  const brief: DailyBrief = {
    date,
    pulse,
    pulseLabel,
    summaryEn,
    summaryNe,
    topStories,
    commitmentsMoved,
    stats,
    generatedAt: new Date().toISOString(),
  };

  // Store in database
  await storeDailyBrief(brief);

  return brief;
}

// ── Storage ──────────────────────────────────────────────────────────────────

async function storeDailyBrief(brief: DailyBrief): Promise<void> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('daily_briefs')
      .upsert(
        {
          date: brief.date,
          pulse: brief.pulse,
          pulse_label: brief.pulseLabel,
          summary_en: brief.summaryEn,
          summary_ne: brief.summaryNe,
          top_stories: brief.topStories,
          commitments_moved: brief.commitmentsMoved,
          stats: brief.stats,
          generated_at: brief.generatedAt,
          regenerated_count: 0,
        },
        { onConflict: 'date' },
      );

    if (error) {
      // Table may not exist yet — log and continue
      console.warn('[DailyBrief] Failed to store brief:', error.message);
    }
  } catch (err) {
    console.warn('[DailyBrief] Storage error:', err instanceof Error ? err.message : err);
  }
}

// ── Accessors ────────────────────────────────────────────────────────────────

/**
 * Get a daily brief for a given date (defaults to today).
 * Returns the cached brief from the database if available.
 */
export async function getDailyBrief(date?: string): Promise<DailyBrief | null> {
  const supabase = getSupabase();
  const targetDate = date || todayDateString();

  try {
    const { data, error } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('date', targetDate)
      .single();

    if (error || !data) return null;

    return {
      date: data.date,
      pulse: data.pulse,
      pulseLabel: data.pulse_label,
      summaryEn: data.summary_en,
      summaryNe: data.summary_ne,
      topStories: data.top_stories || [],
      commitmentsMoved: data.commitments_moved || [],
      stats: data.stats || { totalSignals24h: 0, newSignals: 0, sourcesActive: 0, topSource: '' },
      generatedAt: data.generated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Generate per-sector summaries by grouping signals by their
 * matched commitment sectors / categories.
 */
export async function generateCategorySummaries(): Promise<
  { category: string; signalCount: number; summary: string }[]
> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - HOURS_24_MS).toISOString();

  // Fetch recent signals with their matched commitments
  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('id, title, title_en, content_summary, matched_promise_ids, source_id, relevance_score')
    .gte('discovered_at', cutoff)
    .gte('relevance_score', 0.2)
    .order('relevance_score', { ascending: false })
    .limit(200);

  if (!signals || signals.length === 0) return [];

  // Get commitment IDs that appear in signals
  const allCommitmentIds = new Set<number>();
  for (const s of signals) {
    for (const pid of (s.matched_promise_ids as number[] | null) || []) {
      allCommitmentIds.add(pid);
    }
  }

  if (allCommitmentIds.size === 0) return [];

  // Fetch commitments with their categories
  const { data: commitments } = await supabase
    .from('promises')
    .select('id, title, category')
    .in('id', [...allCommitmentIds]);

  if (!commitments) return [];

  // Build category -> commitment ID mapping
  const categoryMap = new Map<string, Set<number>>();
  for (const c of commitments) {
    const cat = c.category || 'Uncategorized';
    const ids = categoryMap.get(cat) || new Set();
    ids.add(c.id);
    categoryMap.set(cat, ids);
  }

  // Group signals by category
  const categorySummaries: { category: string; signalCount: number; summary: string }[] = [];

  for (const [category, commitmentIdsInCat] of categoryMap) {
    const categorySignals = signals.filter((s) => {
      const pids = (s.matched_promise_ids as number[] | null) || [];
      return pids.some((pid) => commitmentIdsInCat.has(pid));
    });

    if (categorySignals.length === 0) continue;

    // Use AI to summarize the category
    const signalTexts = categorySignals.slice(0, 10).map((s) =>
      `- "${s.title_en || s.title}" (${s.source_id}): ${s.content_summary || ''}`
    ).join('\n');

    try {
      const response = await aiComplete(
        'summarize',
        `You are a concise policy analyst. Summarize the following ${category} sector signals in 2-3 sentences. Be factual and neutral. Respond with ONLY the summary text.`,
        `Signals for ${category} sector:\n${signalTexts}`,
      );

      categorySummaries.push({
        category,
        signalCount: categorySignals.length,
        summary: response.content.trim(),
      });
    } catch {
      categorySummaries.push({
        category,
        signalCount: categorySignals.length,
        summary: `${categorySignals.length} signals detected across ${new Set(categorySignals.map((s) => s.source_id)).size} sources.`,
      });
    }
  }

  return categorySummaries.sort((a, b) => b.signalCount - a.signalCount);
}
