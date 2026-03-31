/**
 * Daily Brief Generator for Nepal Republic
 *
 * Generates a daily intelligence summary by aggregating the last 24 hours
 * of signals, grouping by commitment and topic, and using AI to produce
 * English and Nepali summaries.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';
import {
  isHindiLeaning,
  looksLikeNepali,
  normalizeNepaliRegister,
} from './nepali-text';

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
    summaryNe?: string;
    signalCount: number;
    sources: string[];             // which platforms covered it
    relatedCommitments: number[];  // commitment IDs
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    /** 0-100 importance score — higher = show first */
    importance: number;
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
  audioUrl?: string | null;
  videoUrl?: string | null;
  audioDurationSeconds?: number | null;
}

export interface ReaderHighlight {
  commitmentId: number;
  title: string;
  titleNe: string;
  slug: string;
  direction: 'confirms' | 'contradicts' | 'new_activity';
  directionLabel: string;
  directionLabelNe: string;
  signalCount: number;
  owner: string;
  ownerNe: string;
  whyItMatters: string;
  whyItMattersNe: string;
  nextWatchpoint: string;
  nextWatchpointNe: string;
  confidenceScore: number; // 0-1
  confidenceLabel: 'high' | 'medium' | 'low';
  trustLevel: string;
}

interface RawSignal {
  id: string;
  title: string;
  title_ne: string | null;
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
  summaryBulletsEn?: string[];
  topStories: {
    title: string;
    titleEn?: string;
    summary: string;
    summaryEn?: string;
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
const HOURS_48_MS = 48 * 60 * 60 * 1000;
const HOURS_72_MS = 72 * 60 * 60 * 1000;
const TIME_WINDOWS_MS = [HOURS_24_MS, HOURS_48_MS, HOURS_72_MS] as const;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'not',
  'no', 'so', 'if', 'than', 'that', 'this', 'it', 'its', 'as', 'also',
  'more', 'some', 'any', 'all', 'most', 'other', 'just', 'only', 'very',
  'how', 'what', 'when', 'where', 'who', 'why', 'nepal', 'nepali',
  'said', 'says', 'government', 'minister', 'according', 'report',
  'new', 'year', 'been', 'being', 'about', 'after', 'before',
  // AI analysis junk words — these leak from content_summary of poorly analyzed signals
  'specific', 'commitment', 'commitments', 'article', 'content', 'provided',
  'information', 'event', 'individuals', 'involved', 'dates', 'contains',
  'does', 'appear', 'related', 'promotional', 'message', 'viewers',
  'subscribe', 'channel', 'youtube', 'website', 'latest', 'news',
  'statement', 'classification', 'signal', 'source', 'reports',
  // Nepali stop words
  'को', 'मा', 'ले', 'र', 'छ', 'छन्', 'गरेको', 'भएको', 'हुने',
  'गरेका', 'गर्ने', 'भने', 'यो', 'यस', 'छैन', 'पनि', 'तथा',
  'सम्बन्धित', 'प्रतिबद्धता', 'सरकारको', 'सरकार', 'सरकारले',
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
  // Strip markdown code fences if present
  const cleaned = text.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Try direct parse first
  try {
    const result = JSON.parse(cleaned);
    if (result && typeof result === 'object') return result as T;
  } catch {
    // Direct parse failed
  }

  // Fallback: extract JSON from text — try object first, then array
  try {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
  } catch {
    // Object extraction failed
  }

  try {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      return JSON.parse(arrMatch[0]) as T;
    }
  } catch {
    // Array extraction failed
  }

  return null;
}

function cleanSummaryBullet(text: string): string {
  return text
    .replace(/\s*\(Commitments?\s*[\d,\s]+\)\s*/g, ' ')
    .replace(/\b(confirms|contradicts|new_activity|classification|signal|source count|pulse)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Core: fetch recent signals ───────────────────────────────────────────────

/** Which time window was actually used — affects brief wording */
type TimeWindowUsed = '24h' | '48h' | '72h' | 'recent';

interface FetchResult {
  signals: RawSignal[];
  windowUsed: TimeWindowUsed;
}

async function fetchRecentSignals(): Promise<FetchResult> {
  const supabase = getSupabase();
  const windowLabels: TimeWindowUsed[] = ['24h', '48h', '72h'];

  const selectCols =
    'id, title, title_ne, url, source_id, signal_type, published_at, discovered_at, ' +
    'matched_promise_ids, relevance_score, classification, extracted_data, metadata, ' +
    'content, content_summary, author';

  // Try 24h, then 48h, then 72h
  for (let i = 0; i < TIME_WINDOWS_MS.length; i++) {
    const cutoff = new Date(Date.now() - TIME_WINDOWS_MS[i]).toISOString();

    const { data, error } = await supabase
      .from('intelligence_signals')
      .select(selectCols)
      .gte('discovered_at', cutoff)
      .not('classification', 'eq', 'neutral')
      .order('discovered_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error(`[DailyBrief] Failed to fetch signals (${windowLabels[i]}):`, error.message);
      continue;
    }

    if (data && data.length > 0) {
      // Deduplicate and prioritize before returning
      const deduped = deduplicateSignals(data as unknown as RawSignal[]);
      return { signals: deduped, windowUsed: windowLabels[i] };
    }
  }

  // Final fallback: most recent 50 classified signals regardless of date
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('intelligence_signals')
    .select(selectCols)
    .not('classification', 'eq', 'neutral')
    .not('classification', 'is', null)
    .order('discovered_at', { ascending: false })
    .limit(50);

  if (fallbackError) {
    console.error('[DailyBrief] Fallback fetch failed:', fallbackError.message);
    return { signals: [], windowUsed: 'recent' };
  }

  return { signals: deduplicateSignals((fallbackData || []) as unknown as RawSignal[]), windowUsed: 'recent' };
}

/**
 * Deduplicate signals that are about the same thing.
 * Multiple YouTube channels / RSS feeds often report the same story.
 * Keep the highest-quality version of each unique story.
 */
function deduplicateSignals(signals: RawSignal[]): RawSignal[] {
  const seen = new Map<string, RawSignal>(); // normalized title → best signal

  for (const signal of signals) {
    const title = (signal.title_ne || signal.title || '').toLowerCase().trim();
    // Normalize: strip punctuation, emojis, hashtags, extra spaces
    const normalized = title
      .replace(/[#@\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}❤️]/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60); // compare first 60 chars

    if (normalized.length < 10) continue; // skip garbage titles

    const existing = seen.get(normalized);
    if (!existing) {
      seen.set(normalized, signal);
    } else {
      // Keep the one with better content: prefer RSS over YouTube, prefer ones with published_at
      const existingIsYT = existing.source_id.startsWith('yt-');
      const currentIsYT = signal.source_id.startsWith('yt-');
      if (existingIsYT && !currentIsYT) {
        seen.set(normalized, signal); // prefer RSS over YouTube
      } else if (existing.published_at && !signal.published_at) {
        // keep existing — it has a publication date
      } else if (!existing.published_at && signal.published_at) {
        seen.set(normalized, signal); // prefer signal with publication date
      }
    }
  }

  // Also do fuzzy dedup — titles that share 80%+ words are likely the same story
  const deduped = [...seen.values()];
  const final: RawSignal[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < deduped.length; i++) {
    if (usedIndices.has(i)) continue;
    final.push(deduped[i]);

    const wordsA = new Set(extractKeywords((deduped[i].title_ne || deduped[i].title || '').toLowerCase()));
    if (wordsA.size < 3) continue;

    for (let j = i + 1; j < deduped.length; j++) {
      if (usedIndices.has(j)) continue;
      const wordsB = new Set(extractKeywords((deduped[j].title_ne || deduped[j].title || '').toLowerCase()));
      if (wordsB.size < 3) continue;

      // Count overlap
      let overlap = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
      }
      const similarity = overlap / Math.min(wordsA.size, wordsB.size);
      if (similarity >= 0.7) {
        usedIndices.add(j); // skip this duplicate
      }
    }
  }

  console.log(`[DailyBrief] Deduplication: ${signals.length} → ${final.length} unique signals`);
  return final;
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
    const text = [signal.title_ne || signal.title, signal.content_summary || ''].join(' ');
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

const CATEGORY_IMPACT_MESSAGES: Record<string, string> = {
  Governance:
    'This affects government responsiveness and trust in public institutions.',
  'Anti-Corruption':
    'This affects corruption risk, public trust, and rule-of-law credibility.',
  Infrastructure:
    'This affects service delivery, mobility, and local economic activity.',
  Transport:
    'This affects daily travel time, logistics, and business reliability.',
  Energy:
    'This affects electricity reliability, industrial output, and household costs.',
  Technology:
    'This affects digital service delivery, transparency, and access to state services.',
  Health:
    'This affects access to care, treatment quality, and health equity.',
  Education:
    'This affects school quality, skills development, and long-term jobs outcomes.',
  Environment:
    'This affects disaster resilience, pollution risk, and local quality of life.',
  Economy:
    'This affects jobs, household purchasing power, and investment confidence.',
  Social:
    'This affects social protection, inclusion, and community well-being.',
};

function directionToLabel(
  direction: 'confirms' | 'contradicts' | 'new_activity',
): string {
  if (direction === 'confirms') return 'Progress signal';
  if (direction === 'contradicts') return 'Conflict signal';
  return 'New activity';
}

function directionToLabelNe(
  direction: 'confirms' | 'contradicts' | 'new_activity',
): string {
  if (direction === 'confirms') return 'प्रगति संकेत';
  if (direction === 'contradicts') return 'विवाद संकेत';
  return 'नयाँ गतिविधि';
}

function baseTrustScore(trustLevel: string | null | undefined): number {
  switch (trustLevel) {
    case 'verified':
      return 0.9;
    case 'high':
      return 0.8;
    case 'partial':
    case 'moderate':
      return 0.6;
    case 'low':
      return 0.4;
    case 'unverified':
    default:
      return 0.3;
  }
}

function scoreToLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function toOwner(actors: unknown): string {
  if (Array.isArray(actors) && actors.length > 0) {
    const first = actors.find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );
    if (typeof first === 'string' && first.trim().length > 0) {
      return first.trim();
    }
  }
  return 'Government of Nepal';
}

const ACTOR_NE: Record<string, string> = {
  'Prime Minister': 'प्रधानमन्त्री',
  'Finance Minister': 'अर्थमन्त्री',
  'Law Minister': 'कानून मन्त्री',
  'Home Minister': 'गृहमन्त्री',
  'Education Minister': 'शिक्षामन्त्री',
  'Health Minister': 'स्वास्थ्य मन्त्री',
  'Energy Minister': 'ऊर्जामन्त्री',
  'ICT Minister': 'सूचना प्रविधि मन्त्री',
  'Commerce Minister': 'वाणिज्यमन्त्री',
  'Tourism Minister': 'पर्यटनमन्त्री',
  'Agriculture Minister': 'कृषिमन्त्री',
  'Foreign Minister': 'परराष्ट्रमन्त्री',
  'Chief Secretary': 'मुख्य सचिव',
  'Cabinet Secretary': 'मन्त्रिपरिषद् सचिव',
  'NPC Vice Chair': 'राष्ट्रिय योजना आयोग उपाध्यक्ष',
  'NRB Governor': 'नेपाल राष्ट्र बैंक गभर्नर',
  'CIAA Chief': 'अख्तियार प्रमुख',
  'Attorney General': 'महान्यायाधिवक्ता',
  'Government of Nepal': 'नेपाल सरकार',
};

function toOwnerNe(actors: unknown): string {
  const en = toOwner(actors);
  return ACTOR_NE[en] || en;
}

function whyItMattersFor(
  category: string | null | undefined,
  direction: 'confirms' | 'contradicts' | 'new_activity',
  title?: string,
  signalCount?: number,
  status?: string | null,
): string {
  const impact =
    CATEGORY_IMPACT_MESSAGES[category || ''] ||
    'This affects public accountability and confidence in delivery.';

  const signals = signalCount && signalCount > 1 ? `${signalCount} sources reporting` : '';

  if (direction === 'contradicts') {
    return `${signals ? signals + '. ' : ''}Contradictory reports on this commitment — needs independent verification before status can change.`;
  }
  if (direction === 'confirms') {
    if (status === 'not_started') {
      return `${signals ? signals + '. ' : ''}First signs of movement on a commitment that was previously inactive. ${impact}`;
    }
    return `${signals ? signals + '. ' : ''}Multiple sources confirm progress is happening. ${impact}`;
  }
  if (status === 'stalled') {
    return `${signals ? signals + '. ' : ''}Activity detected on a stalled commitment — monitoring if this signals a restart. ${impact}`;
  }
  return `${signals ? signals + '. ' : ''}New coverage detected. ${impact}`;
}

function nextWatchpointFor(
  direction: 'confirms' | 'contradicts' | 'new_activity',
  status: string | null | undefined,
  owner?: string,
): string {
  const actor = owner && owner !== 'Government of Nepal' ? owner : 'the responsible ministry';

  if (direction === 'contradicts') {
    return `Watch for official response from ${actor} or competing evidence within 7 days.`;
  }

  if (direction === 'confirms' && status === 'delivered') {
    return 'Watch for independent on-ground verification and beneficiary feedback.';
  }

  if (direction === 'confirms') {
    return `Watch for ${actor} to release budget, procurement, or milestone updates.`;
  }

  if (status === 'not_started') {
    return `Watch for ${actor} to announce a formal plan or allocate budget.`;
  }

  return `Watch for ${actor} to show concrete execution proof or timeline.`;
}

const CATEGORY_IMPACT_MESSAGES_NE: Record<string, string> = {
  Governance: 'यसले सरकारी जवाफदेहिता र सार्वजनिक संस्थामा विश्वासमा असर गर्छ।',
  'Anti-Corruption': 'यसले भ्रष्टाचार जोखिम, सार्वजनिक विश्वास र कानूनी विश्वसनीयतामा असर गर्छ।',
  Infrastructure: 'यसले सेवा वितरण, यातायात र स्थानीय आर्थिक गतिविधिमा असर गर्छ।',
  Transport: 'यसले दैनिक यात्रा समय, रसद र व्यापार विश्वसनीयतामा असर गर्छ।',
  Energy: 'यसले बिजुली विश्वसनीयता, औद्योगिक उत्पादन र घरेलु खर्चमा असर गर्छ।',
  Technology: 'यसले डिजिटल सेवा, पारदर्शिता र राज्य सेवामा पहुँचमा असर गर्छ।',
  Health: 'यसले स्वास्थ्य सेवामा पहुँच, उपचार गुणस्तर र स्वास्थ्य समानतामा असर गर्छ।',
  Education: 'यसले विद्यालयको गुणस्तर, सीप विकास र दीर्घकालीन रोजगार परिणाममा असर गर्छ।',
  Environment: 'यसले प्रकोप लचिलोपन, प्रदूषण जोखिम र जीवनस्तरमा असर गर्छ।',
  Economy: 'यसले रोजगारी, घरेलु क्रयशक्ति र लगानी विश्वासमा असर गर्छ।',
  Social: 'यसले सामाजिक सुरक्षा, समावेशिता र सामुदायिक कल्याणमा असर गर्छ।',
};

function whyItMattersForNe(
  category: string | null | undefined,
  direction: 'confirms' | 'contradicts' | 'new_activity',
  signalCount?: number,
  status?: string | null,
): string {
  const impact = CATEGORY_IMPACT_MESSAGES_NE[category || ''] || 'यसले सार्वजनिक जवाफदेहिता र कार्यान्वयनमा विश्वासमा असर गर्छ।';
  const signals = signalCount && signalCount > 1 ? `${signalCount} स्रोतहरूले रिपोर्ट गरिरहेका छन्। ` : '';

  if (direction === 'contradicts') return `${signals}विरोधाभासी रिपोर्टहरू — स्वतन्त्र प्रमाणीकरण आवश्यक।`;
  if (direction === 'confirms') {
    if (status === 'not_started') return `${signals}पहिले निष्क्रिय प्रतिबद्धतामा पहिलो हलचलको संकेत। ${impact}`;
    return `${signals}बहु स्रोतहरूले प्रगति पुष्टि गर्दैछन्। ${impact}`;
  }
  if (status === 'stalled') return `${signals}रोकिएको प्रतिबद्धतामा गतिविधि — पुनः सुरु हुने संकेत अनुगमन गर्दै। ${impact}`;
  return `${signals}नयाँ कभरेज पत्ता लागेको। ${impact}`;
}

function nextWatchpointForNe(
  direction: 'confirms' | 'contradicts' | 'new_activity',
  status: string | null | undefined,
  owner?: string,
): string {
  const actor = owner || 'जिम्मेवार मन्त्रालय';
  if (direction === 'contradicts') return `${actor}बाट ७ दिनभित्र आधिकारिक प्रतिक्रिया वा प्रमाण हेर्नुहोस्।`;
  if (direction === 'confirms' && status === 'delivered') return 'स्वतन्त्र भूमि प्रमाणीकरण र लाभग्राही प्रतिक्रिया हेर्नुहोस्।';
  if (direction === 'confirms') return `${actor}ले बजेट, खरिद वा माइलस्टोन अपडेट जारी गर्ने हेर्नुहोस्।`;
  if (status === 'not_started') return `${actor}ले औपचारिक योजना वा बजेट विनियोजन घोषणा गर्ने हेर्नुहोस्।`;
  return `${actor}ले ठोस कार्यान्वयन प्रमाण वा समयरेखा देखाउने हेर्नुहोस्।`;
}

interface PromiseReadModel {
  id: number | string;
  title: string;
  title_ne?: string | null;
  slug: string | null;
  category: string | null;
  status: string | null;
  trust_level: string | null;
  actors: string[] | null;
  source_count: number | null;
}

export async function buildReaderHighlights(
  brief: Pick<DailyBrief, 'commitmentsMoved'>,
  maxItems = 5,
): Promise<ReaderHighlight[]> {
  const moved = brief.commitmentsMoved || [];
  if (moved.length === 0) return [];

  const ids = Array.from(
    new Set(
      moved
        .map((item) => item.commitmentId)
        .filter((value) => Number.isFinite(value)),
    ),
  );

  if (ids.length === 0) return [];

  const supabase = getSupabase();
  const { data } = await supabase
    .from('promises')
    .select('id, title, title_ne, slug, category, status, trust_level, actors, source_count')
    .in('id', ids);

  const rowMap = new Map<number, PromiseReadModel>();
  for (const row of (data || []) as PromiseReadModel[]) {
    const id = Number(row.id);
    if (Number.isFinite(id)) {
      rowMap.set(id, row);
    }
  }

  const highlights = moved
    .map((item) => {
      const promiseRow = rowMap.get(item.commitmentId);
      const trustLevel = promiseRow?.trust_level || 'unverified';
      const sourceCount = promiseRow?.source_count || 0;
      const score = Math.max(
        0,
        Math.min(
          1,
          baseTrustScore(trustLevel) +
            Math.min(0.1, sourceCount * 0.01) +
            Math.min(0.1, item.signalCount * 0.02),
        ),
      );

      const owner = toOwner(promiseRow?.actors);
      const ownerNe = toOwnerNe(promiseRow?.actors);

      return {
        commitmentId: item.commitmentId,
        title: promiseRow?.title || item.title,
        titleNe: promiseRow?.title_ne || promiseRow?.title || item.title,
        slug:
          promiseRow?.slug && promiseRow.slug.trim().length > 0
            ? promiseRow.slug
            : String(item.commitmentId),
        direction: item.direction,
        directionLabel: directionToLabel(item.direction),
        directionLabelNe: directionToLabelNe(item.direction),
        signalCount: item.signalCount,
        owner,
        ownerNe,
        whyItMatters: whyItMattersFor(promiseRow?.category, item.direction, promiseRow?.title, item.signalCount, promiseRow?.status),
        whyItMattersNe: whyItMattersForNe(promiseRow?.category, item.direction, item.signalCount, promiseRow?.status),
        nextWatchpoint: nextWatchpointFor(item.direction, promiseRow?.status, owner),
        nextWatchpointNe: nextWatchpointForNe(item.direction, promiseRow?.status, ownerNe),
        confidenceScore: score,
        confidenceLabel: scoreToLabel(score),
        trustLevel,
      } as ReaderHighlight;
    })
    .sort((a, b) => {
      // Contradictions first (most newsworthy), then by signal count + confidence
      const aPriority = (a.direction === 'contradicts' ? 100 : 0) + a.signalCount * 2 + a.confidenceScore * 10;
      const bPriority = (b.direction === 'contradicts' ? 100 : 0) + b.signalCount * 2 + b.confidenceScore * 10;
      return bPriority - aPriority;
    })
    .slice(0, maxItems);

  return highlights;
}

// ── Salvage partial AI responses ─────────────────────────────────────────────

/**
 * When the AI returns truncated/invalid JSON (common with Nepali text containing
 * unescaped characters), try to extract usable fields from the partial response.
 */
function salvageAIResponse(raw: string): AIBriefResponse | null {
  const result: Partial<AIBriefResponse> = {};

  // Extract summaryBullets array — find the first [...] after "summaryBullets"
  const bulletsMatch = raw.match(/"summaryBullets"\s*:\s*(\[[\s\S]*?\])/);
  if (bulletsMatch) {
    try {
      result.summaryBullets = JSON.parse(bulletsMatch[1]);
    } catch {
      // Try extracting individual strings
      const items = [...bulletsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
      if (items.length > 0) result.summaryBullets = items;
    }
  }

  // Extract summaryBulletsEn
  const bulletsEnMatch = raw.match(/"summaryBulletsEn"\s*:\s*(\[[\s\S]*?\])/);
  if (bulletsEnMatch) {
    try {
      result.summaryBulletsEn = JSON.parse(bulletsEnMatch[1]);
    } catch {
      const items = [...bulletsEnMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
      if (items.length > 0) result.summaryBulletsEn = items;
    }
  }

  // Extract topStories array
  const storiesMatch = raw.match(/"topStories"\s*:\s*(\[[\s\S]*?\]\s*\])/);
  if (storiesMatch) {
    try {
      result.topStories = JSON.parse(storiesMatch[1]);
    } catch {
      // topStories is complex nested JSON — skip if it doesn't parse
    }
  }

  if (result.summaryBullets && result.summaryBullets.length > 0) {
    console.log('[DailyBrief] Salvaged', result.summaryBullets.length, 'bullets,', result.summaryBulletsEn?.length || 0, 'bulletsEn,', result.topStories?.length || 0, 'stories');
    return result as AIBriefResponse;
  }

  return null;
}

// ── Core: AI summarization ───────────────────────────────────────────────────

async function generateAISummary(
  signals: RawSignal[],
  commitmentGroups: CommitmentGroup[],
  topicGroups: TopicGroup[],
  windowUsed: TimeWindowUsed = '24h',
): Promise<AIBriefResponse | null> {
  // Build context — strip all internal IDs, scores, and jargon so AI never sees them
  // Filter out signals with junk AI summaries (these poison the brief)
  const JUNK_PHRASES = [
    'does not contain any information',
    'does not provide specific information',
    'appears to be a promotional message',
    'encouraging viewers to subscribe',
    'not contain any',
    'no specific information',
  ];
  const isJunkSummary = (s: string) => JUNK_PHRASES.some((p) => s.toLowerCase().includes(p));

  const usableSignals = signals.filter((s) => {
    const summary = s.content_summary || '';
    return !isJunkSummary(summary);
  });

  // Score signals for AI context: prefer fresh, RSS, with real summaries
  const now = Date.now();
  const scoredSignals = (usableSignals.length > 0 ? usableSignals : signals).map((s) => {
    let score = 0;
    // Freshness: published_at within 24h gets max points
    const pubDate = s.published_at ? new Date(s.published_at).getTime() : 0;
    const discDate = new Date(s.discovered_at).getTime();
    const effectiveDate = pubDate || discDate;
    const hoursOld = (now - effectiveDate) / (1000 * 60 * 60);
    if (hoursOld < 12) score += 50;
    else if (hoursOld < 24) score += 40;
    else if (hoursOld < 48) score += 20;
    else score += 5; // old news gets minimal score
    // Source quality: RSS has better text, YouTube has broader reach — both matter
    if (s.source_id.startsWith('rss-')) score += 25;
    else if (s.source_id.startsWith('yt-')) score += 15;
    else score += 20;
    // Has real content summary (not junk)
    if (s.content_summary && s.content_summary.length > 50 && !isJunkSummary(s.content_summary)) score += 20;
    // Has published_at date
    if (s.published_at) score += 10;
    // Relevance score
    score += (s.relevance_score || 0) * 10;
    return { signal: s, score };
  });

  // Sort by score descending, take top 25 for AI context
  scoredSignals.sort((a, b) => b.score - a.score);
  const topSignals = scoredSignals.slice(0, 25).map((s) => s.signal);

  const signalContext = topSignals.map((s, i) => {
    const title = s.title_ne || s.title;
    const summary = s.content_summary && !isJunkSummary(s.content_summary)
      ? s.content_summary
      : (s.content || '').slice(0, 200);
    const pubInfo = s.published_at ? ` [Published: ${s.published_at.slice(0, 10)}]` : '';
    const sourceType = s.source_id.startsWith('rss-') ? 'News' : s.source_id.startsWith('yt-') ? 'YouTube' : 'Other';
    return `${i + 1}. "${title}" (${sourceType}${pubInfo})\n   ${summary}`;
  }).join('\n\n');

  const commitmentContext = commitmentGroups.slice(0, 10).map((g) => {
    // Use the most common signal title as a proxy for the commitment topic
    const topSignal = g.signals[0];
    const topic = topSignal?.title_ne || topSignal?.title || 'Government activity';
    return `- ${topic}: ${g.signals.length} news reports`;
  }).join('\n');

  const topicContext = topicGroups.slice(0, 10).map((g) =>
    `- ${g.topic}: covered by ${g.sources.size} different outlets`
  ).join('\n');

  const timeLabel = windowUsed === '24h' ? 'last 24 hours' : windowUsed === '48h' ? 'last 48 hours' : windowUsed === '72h' ? 'last 72 hours' : 'most recent available';
  const todayStr = todayDateString(); // e.g. "2026-03-31"
  const systemPrompt = `You write a 2-minute Nepali daily news brief for ${todayStr}. It will be READ ALOUD on air by a news anchor.

Your job: take raw news data and turn it into a brief that a regular Nepali person finds useful and easy to follow. Connect the dots — explain WHY each thing matters to people's daily lives.

CRITICAL — FRESHNESS:
- Today is ${todayStr}. ONLY include developments from TODAY or yesterday.
- If something happened 3+ days ago (like someone becoming PM, cabinet formation, etc.), it is OLD NEWS. Do NOT include it unless there is a NEW development about it today.
- "Balen became PM" is NOT news if it happened days ago. "Balen's first cabinet meeting decided X" IS news if it happened today.
- Focus on: What CHANGED today? What NEW decision was made? What NEW statement was given? What NEW event happened?
- If a news report is clearly about an old event re-shared on YouTube, SKIP IT.

RULES:
- Write in simple everyday Nepali — a taxi driver or shopkeeper should understand every word
- NO English words, NO acronyms (say ठगी not MBBS fraud, say अर्थतन्त्र not GDP)
- NO fancy/textbook words like पारदर्शिता, विश्वसनीयता, लोकतान्त्रिक प्रक्रिया, प्रतिबद्धता
- NO numbers, NO IDs, NO technical labels
- Short sentences. Like talking to a friend over tea
- 6-8 bullets covering DIFFERENT topics. No repeating the same story
- Each bullet: what happened TODAY + why it matters to ordinary people (1-2 simple sentences)
- 180-220 Nepali words total. Fill the 2 minutes with real substance
- Name the person and what they did — then say what it means for us

GOOD examples:
  "स्वर्णिमले आज बजेट कटौती गर्ने भने। हाम्रो बाटो र अस्पतालमा असर पर्छ।"
  "सुदन गुरुङले घुस लिनेलाई छाड्दिन भने। भ्रष्टाचारमा कडाइ हुने देखिन्छ।"
  "पोखरामा आज विरोध भयो। सडक अवरुद्ध छ।"
BAD examples (old news rehashed):
  "बालेन प्रधानमन्त्री भए।" (days old — skip unless NEW angle)
  "राष्ट्रिय स्वतन्त्र पार्टीले सरकार बनायो।" (old — everyone knows this)

NAME RULES:
- Famous people: first name only (बालेन, not बालेन शाह)
- Less known people: full name (सुदन गुरुङ, दीपक शाह)
- "भए" is enough — don't say "शपथ ग्रहण गरेपछि पद सम्हाले"

Respond in JSON:
{
  "summaryBullets": ["Simple short Nepali sentence", "Another simple sentence", ...],
  "summaryBulletsEn": ["Same bullet in plain English", "Another bullet in English", ...],
  "topStories": [
    {
      "title": "Short Nepali headline (4-6 words)",
      "titleEn": "Same headline in English",
      "titleNe": "Same as title",
      "summary": "One simple Nepali sentence about what it means for people",
      "summaryEn": "Same sentence in English",
      "sentiment": "positive|negative|neutral|mixed",
      "signalIds": []
    }
  ],
  "commitmentUpdates": [
    {
      "commitmentId": 123,
      "direction": "confirms|contradicts|new_activity",
      "keyFinding": "Simple Nepali sentence"
    }
  ]
}`;

  const userPrompt = `Write today's (${todayStr}) government brief from these ${timeLabel} news reports.

IMPORTANT: Only summarize things that happened TODAY or yesterday. Skip anything older — your audience already knows about it.

NEWS REPORTS (sorted by freshness and quality):
${signalContext}

GOVERNMENT AREAS WITH ACTIVITY:
${commitmentContext || 'No notable government activity.'}

TOPICS COVERED BY MULTIPLE OUTLETS:
${topicContext || 'No trending topics.'}

Total reports in period: ${signals.length}
Remember: Focus on what is NEW today, not what everyone already heard about days ago.`;

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    const parsed = parseJSON<AIBriefResponse>(response.content);

    // If parsed is null (JSON truncated), try to salvage summaryBullets from the raw text
    if (!parsed || !parsed.summaryBullets) {
      console.warn('[DailyBrief] Full JSON parse failed, attempting salvage');
      return salvageAIResponse(response.content);
    }

    return parsed;
  } catch (err) {
    console.error('[DailyBrief] AI summary generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function translateToEnglish(nepaliText: string): Promise<string> {
  const systemPrompt = `You are a translator. Translate the following Nepali text into clear, simple English. Keep the same structure (one sentence per line). Return only the translated text.`;

  try {
    const response = await aiComplete('summarize', systemPrompt, nepaliText);
    return response.content.trim();
  } catch (err) {
    console.warn('[DailyBrief] English translation failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

async function translateToNepali(englishSummary: string): Promise<string> {
  const systemPrompt = `You are a Nepali newsroom translator. Translate English political brief text into clear Nepali used in Nepal newsrooms.

Rules:
- Use Nepali (Devanagari) only
- Prefer Nepal-style wording over Hindi-style wording
- Keep the meaning factual and unchanged
- Keep the same bullet/line structure
- Return only translated text`;

  try {
    const response = await aiComplete('summarize', systemPrompt, englishSummary);
    return normalizeNepaliRegister(response.content.trim());
  } catch (err) {
    console.warn('[DailyBrief] Nepali translation failed:', err instanceof Error ? err.message : err);
    return '';
  }
}

async function generateNepaliSummary(
  aiSummary: AIBriefResponse | null,
  englishSummary: string,
  windowUsed: TimeWindowUsed,
): Promise<string> {
  const period =
    windowUsed === '24h'
      ? 'आज'
      : windowUsed === '48h'
      ? 'पछिल्लो ४८ घण्टा'
      : windowUsed === '72h'
      ? 'पछिल्लो ७२ घण्टा'
      : 'हालका दिनहरू';

  const nepaliPrompt = `You are the Nepali editorial desk for Nepal Republic.
Write a short public-facing Nepali daily summary in 3-5 lines for readers in Nepal.

Rules:
- Nepali (Devanagari) only
- Sound like Nepal newsroom language, not Hindi broadcast wording
- Keep it factual, concise, and neutral
- Mention contradictions or accountability concerns if present
- No internal labels, no IDs, no technical terms
- One key development per line
- Return plain text only`;

  const payload = aiSummary
    ? JSON.stringify(
        {
          period,
          summaryBullets: aiSummary.summaryBullets || [],
          topStories: (aiSummary.topStories || []).slice(0, 5).map((story) => ({
            title: story.title,
            summary: story.summary,
            sentiment: story.sentiment,
          })),
        },
        null,
        2,
      )
    : `${period}\n${englishSummary}`;

  try {
    const response = await aiComplete('summarize', nepaliPrompt, payload);
    const content = normalizeNepaliRegister(response.content.trim());
    if (looksLikeNepali(content) && !isHindiLeaning(content)) {
      return content;
    }
  } catch (err) {
    console.warn('[DailyBrief] Nepali editorial summary failed:', err instanceof Error ? err.message : err);
  }

  const translated = await translateToNepali(englishSummary);
  if (translated && looksLikeNepali(translated)) {
    return normalizeNepaliRegister(translated);
  }

  return normalizeNepaliRegister(
    `${period} का मुख्य सार्वजनिक अद्यावधिकहरूलाई समेटेर यो दैनिक संक्षेप तयार गरिएको हो। ` +
      `थप प्रमाण र स्पष्टता आउँदै जाँदा तथ्यहरू क्रमशः अद्यावधिक गरिनेछन्।`,
  );
}

// ── Story importance scoring ─────────────────────────────────────────────────

/**
 * Score a story 0-100 based on newsworthiness signals.
 * Higher = show first in the brief.
 */
function computeStoryImportance(
  signalCount: number,
  sourceCount: number,
  commitmentCount: number,
  sentiment: string,
  hasContradiction: boolean,
): number {
  // Signal volume (log scale, max 30 pts)
  const volumeScore = Math.min(30, Math.round(Math.log1p(signalCount) * 10));

  // Source diversity — story covered by many different sources = more credible/important (max 25 pts)
  const diversityScore = Math.min(25, sourceCount * 5);

  // Commitment breadth — affects more commitments = wider impact (max 15 pts)
  const breadthScore = Math.min(15, commitmentCount * 3);

  // Sentiment boost — negative/mixed are more newsworthy than positive/neutral (max 15 pts)
  const sentimentScore =
    sentiment === 'negative' ? 15 :
    sentiment === 'mixed' ? 12 :
    sentiment === 'positive' ? 5 :
    0;

  // Contradiction bonus — conflicting evidence is the most newsworthy (max 15 pts)
  const contradictionScore = hasContradiction ? 15 : 0;

  return Math.min(100, volumeScore + diversityScore + breadthScore + sentimentScore + contradictionScore);
}

// ── Main: generate daily brief ───────────────────────────────────────────────

export async function generateDailyBrief(): Promise<DailyBrief> {
  const { signals, windowUsed } = await fetchRecentSignals();
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
  const aiSummary = await generateAISummary(signals, commitmentGroups, topicGroups, windowUsed);

  // Build summaryEn (English) and summaryNe (Nepali) from AI or fallback
  const isWiderWindow = windowUsed !== '24h';
  const periodLabel = isWiderWindow ? 'Recent developments' : 'Today';
  let summaryEn: string;
  let summaryNe: string;

  // AI summaryBullets are Nepali; summaryBulletsEn are English
  if (aiSummary?.summaryBulletsEn?.length) {
    // Use the English bullets the AI provided
    const cleanedEn = aiSummary.summaryBulletsEn
      .map(cleanSummaryBullet)
      .filter((line) => line.length > 0);
    summaryEn = cleanedEn.map((b) => `- ${b}`).join('\n');
    if (!summaryEn.trim()) {
      summaryEn = `- ${periodLabel}: ${signals.length} intelligence signals collected from ${stats.sourcesActive} sources.`;
    }
  } else if (aiSummary?.summaryBullets?.length) {
    // AI returned Nepali bullets but no English — translate them
    try {
      const nepaliText = aiSummary.summaryBullets.join('\n');
      const translated = await translateToEnglish(nepaliText);
      if (translated && translated.trim()) {
        summaryEn = translated.split('\n').filter(l => l.trim()).map(b => `- ${b.replace(/^-\s*/, '')}`).join('\n');
      } else {
        summaryEn = `- ${periodLabel}: ${signals.length} intelligence signals collected from ${stats.sourcesActive} sources.`;
      }
    } catch {
      summaryEn = `- ${periodLabel}: ${signals.length} intelligence signals collected from ${stats.sourcesActive} sources.`;
    }
  } else {
    // No AI summary at all — generate basic English summary from data
    // Don't claim specific counts or false "top topics" — keep it honest
    const bullets: string[] = [];
    bullets.push(`${periodLabel}: Our sources were scanned for new developments.`);
    if (commitmentGroups.length > 0) {
      bullets.push(`${commitmentGroups.length} government commitments showed activity.`);
    }
    // Only show topics that are real Nepali words or substantive English words (not junk)
    const JUNK_TOPICS = new Set(['specific', 'commitment', 'article', 'content', 'provided', 'information', 'statement']);
    const enTopics = topicGroups
      .slice(0, 3)
      .map((t) => t.topic)
      .filter((t) => !JUNK_TOPICS.has(t.toLowerCase()) && t.length > 3);
    if (enTopics.length > 0) {
      bullets.push(`Key areas: ${enTopics.join(', ')}.`);
    }
    summaryEn = bullets.map((b) => `- ${b}`).join('\n');
  }

  // Build Nepali summary: prefer AI Nepali bullets, fall back to generateNepaliSummary
  if (aiSummary?.summaryBullets?.length) {
    const cleanedNe = aiSummary.summaryBullets
      .map(cleanSummaryBullet)
      .filter((line) => line.length > 0);
    const neFromBullets = cleanedNe.join('\n');
    if (neFromBullets.trim()) {
      summaryNe = neFromBullets;
    } else {
      summaryNe = await generateNepaliSummary(aiSummary, summaryEn, windowUsed);
    }
  } else {
    summaryNe = await generateNepaliSummary(aiSummary, summaryEn, windowUsed);
  }

  // Build topStories with importance scoring
  const topStories: DailyBrief['topStories'] = [];

  if (aiSummary?.topStories?.length) {
    for (const story of aiSummary.topStories.slice(0, 8)) {
      const matchedSignals = story.signalIds
        ?.map((id) => signals.find((s) => s.id === id))
        .filter(Boolean) as RawSignal[] | undefined;

      const sources = new Set<string>();
      const relatedCommitments = new Set<number>();
      let hasContradiction = false;
      for (const s of matchedSignals || []) {
        sources.add(s.source_id);
        if (s.classification === 'contradicts') hasContradiction = true;
        for (const pid of s.matched_promise_ids || []) {
          relatedCommitments.add(pid);
        }
      }

      // Detect language to handle AI returning fields in wrong language
      const isNepaliTitle = (t: string) => /[\u0900-\u097F]/.test(t);
      const rawTitle = story.title || '';
      const rawTitleEn = story.titleEn || '';
      const rawSummary = story.summary || '';
      const rawSummaryEn = story.summaryEn || '';

      // If titleEn looks Nepali and title looks English, they're swapped
      const titleSwapped = rawTitleEn && isNepaliTitle(rawTitleEn) && !isNepaliTitle(rawTitle);
      const summarySwapped = rawSummaryEn && isNepaliTitle(rawSummaryEn) && !isNepaliTitle(rawSummary);

      const enTitle = titleSwapped ? rawTitle : (rawTitleEn || rawTitle);
      const neTitle = titleSwapped ? rawTitleEn : rawTitle;
      const enSummary = summarySwapped ? rawSummary : (rawSummaryEn || rawSummary);
      const neSummary = summarySwapped ? rawSummaryEn : rawSummary;

      topStories.push({
        title: enTitle,
        titleNe: neTitle,
        summary: enSummary,
        summaryNe: neSummary,
        signalCount: story.signalIds?.length || 0,
        sources: [...sources],
        relatedCommitments: [...relatedCommitments],
        sentiment: story.sentiment || 'neutral',
        importance: computeStoryImportance(
          story.signalIds?.length || 0,
          sources.size,
          relatedCommitments.size,
          story.sentiment || 'neutral',
          hasContradiction,
        ),
      });
    }
  } else {
    // Fallback: build from topic groups
    for (const group of topicGroups.slice(0, 8)) {
      const topSignal = group.signals[0];
      const hasContradiction = group.signals.some((s) => s.classification === 'contradicts');
      topStories.push({
        title: group.topic,
        summary: topSignal?.title || topSignal?.content_summary || '',
        summaryNe: topSignal?.title_ne || topSignal?.content_summary || '',
        signalCount: group.signals.length,
        sources: [...group.sources],
        relatedCommitments: [...group.relatedCommitments],
        sentiment: 'neutral',
        importance: computeStoryImportance(
          group.signals.length,
          group.sources.size,
          group.relatedCommitments.size,
          'neutral',
          hasContradiction,
        ),
      });
    }
  }

  // Sort by importance — most important first
  topStories.sort((a, b) => b.importance - a.importance);

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
        keySignal: keySignal?.title_ne || keySignal?.title || update.keyFinding,
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
        keySignal: keySignal?.title_ne || keySignal?.title || '',
      });
    }
  }

  // Sort commitmentsMoved — contradictions first (most newsworthy), then by signal count
  commitmentsMoved.sort((a, b) => {
    const aScore = (a.direction === 'contradicts' ? 100 : a.direction === 'confirms' ? 50 : 0) + a.signalCount;
    const bScore = (b.direction === 'contradicts' ? 100 : b.direction === 'confirms' ? 50 : 0) + b.signalCount;
    return bScore - aScore;
  });

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
    // First, check if a brief already exists for this date so we preserve audio fields
    const { data: existing } = await supabase
      .from('daily_briefs')
      .select('audio_url, audio_generated_at, audio_duration_seconds, video_url, regenerated_count, summary_en, top_stories')
      .eq('date', brief.date)
      .single();

    // ── Quality gate: never replace a good brief with a worse one ────────
    if (existing) {
      const oldTopStories = Array.isArray(existing.top_stories) ? existing.top_stories.length : 0;
      const newTopStories = brief.topStories?.length ?? 0;
      const oldHasSummary = existing.summary_en && existing.summary_en.length > 50;
      const newHasSummary = brief.summaryEn && brief.summaryEn.length > 50;

      // If old brief had real content but new one is basically empty, keep the old one
      if (oldHasSummary && !newHasSummary && oldTopStories > 0 && newTopStories === 0) {
        console.warn('[DailyBrief] Quality gate: new brief is worse than existing. Keeping old brief.');
        return;
      }
      // If old brief had multiple stories but new brief has none, keep old
      if (oldTopStories >= 3 && newTopStories === 0) {
        console.warn('[DailyBrief] Quality gate: new brief has 0 top stories vs existing', oldTopStories, '. Keeping old brief.');
        return;
      }
    }

    const regenCount = (existing?.regenerated_count ?? 0) + (existing ? 1 : 0);

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
          regenerated_count: regenCount,
          // Preserve existing audio — don't wipe it on brief regeneration
          audio_url: existing?.audio_url ?? null,
          audio_generated_at: existing?.audio_generated_at ?? null,
          audio_duration_seconds: existing?.audio_duration_seconds ?? null,
          video_url: existing?.video_url ?? null,
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
      audioUrl: data.audio_url || null,
      videoUrl: data.video_url || null,
      audioDurationSeconds: data.audio_duration_seconds || null,
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

  // Try cascading time windows: 24h -> 48h -> 72h -> most recent
  let signals: any[] | null = null;
  for (const windowMs of TIME_WINDOWS_MS) {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const { data } = await supabase
      .from('intelligence_signals')
      .select('id, title, title_ne, content_summary, matched_promise_ids, source_id, relevance_score')
      .gte('discovered_at', cutoff)
      .gte('relevance_score', 0.2)
      .order('relevance_score', { ascending: false })
      .limit(200);
    if (data && data.length > 0) {
      signals = data;
      break;
    }
  }

  // Final fallback: most recent 50 regardless of date
  if (!signals || signals.length === 0) {
    const { data } = await supabase
      .from('intelligence_signals')
      .select('id, title, title_ne, content_summary, matched_promise_ids, source_id, relevance_score')
      .gte('relevance_score', 0.2)
      .order('discovered_at', { ascending: false })
      .limit(50);
    signals = data;
  }

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
      `- "${s.title_ne || s.title}" (${s.source_id}): ${s.content_summary || ''}`
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
