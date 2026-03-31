/**
 * Source Discovery Layer
 *
 * Automatically discovers and suggests new intelligence sources based on:
 * 1. Authors/journalists frequently cited in high-quality signals
 * 2. Domains/websites frequently referenced in articles
 * 3. YouTube channels mentioned or linked in signals
 * 4. Social media accounts of officials who make policy announcements
 * 5. International organizations publishing Nepal reports
 *
 * The AI can call `suggestNewSources()` after each sweep to identify
 * potentially valuable new sources to add. Suggestions are stored in
 * `intelligence_source_suggestions` for admin review, or auto-added
 * if confidence is high enough.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceSuggestion {
  /** Suggested source ID (slug format) */
  suggestedId: string;
  /** Display name */
  name: string;
  /** Source type */
  sourceType: 'rss' | 'youtube' | 'facebook' | 'website' | 'x' | 'tiktok';
  /** URL to scrape */
  url: string;
  /** RSS feed URL if applicable */
  feedUrl?: string;
  /** Why the AI thinks this source is valuable */
  reasoning: string;
  /** Confidence that this source is worth adding (0-1) */
  confidence: number;
  /** Which commitment IDs this source might cover */
  relatedPromiseIds: number[];
  /** How many times this source was referenced in existing signals */
  referenceCount: number;
  /** Category */
  category: 'politician' | 'journalist' | 'think_tank' | 'international_org' | 'news' | 'government' | 'commentary';
  /** Language */
  language: 'en' | 'ne';
  /** Auto-approve threshold met? */
  autoApprove: boolean;
}

// ---------------------------------------------------------------------------
// Known source domains to SKIP (already tracked)
// ---------------------------------------------------------------------------

const KNOWN_DOMAINS = new Set([
  'kathmandupost.com', 'onlinekhabar.com', 'english.onlinekhabar.com',
  'thehimalayantimes.com', 'myrepublica.nagariknetwork.com', 'nepalitimes.com',
  'theannapurnaexpress.com', 'risingnepaldaily.com', 'english.nepalnews.com',
  'english.khabarhub.com', 'english.ratopati.com', 'setopati.com',
  'ekantipur.com', 'nagariknews.nagariknetwork.com', 'recordnepal.com',
  'gorkhapatraonline.com', 'pahilopost.com', 'baahrakhari.com',
  'deshsanchar.com', 'lokpath.com', 'nepalsamaya.com', 'dcnepal.com',
  'southasiacheck.org', 'nepalmonitor.org', 'nepalisansar.com',
  'spotlightnepal.com', 'lokantar.com', 'arthadabali.com', 'bizmandu.com',
  'swasthyakhabar.com', 'arthapath.com', 'hamrakura.com', 'nepalpress.com',
  'techmandu.com', 'sasmitpokhrel.com', 'ictframe.com', 'sharesansar.com',
  'fiscalnepal.com', 'newbusinessage.com', 'farsightnepal.com',
  'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
  // Government
  'opmcm.gov.np', 'parliament.gov.np', 'npc.gov.np', 'ciaa.gov.np',
  'ppmo.gov.np', 'nrb.org.np', 'cbs.gov.np', 'tepc.gov.np', 'ird.gov.np',
  'nea.org.np', 'doed.gov.np', 'kukl.org.np', 'dor.gov.np', 'caanepal.gov.np',
  'mocit.gov.np', 'hib.gov.np', 'mohp.gov.np', 'moe.gov.np', 'ctevt.org.np',
  'molcpa.gov.np', 'election.gov.np', 'welcomenepal.com', 'ssf.gov.np',
  'nepalpassport.gov.np', 'moless.gov.np', 'deoc.gov.np', 'mofaga.gov.np',
  'moljpa.gov.np', 'immigration.gov.np', 'mof.gov.np', 'mopit.gov.np',
  'moud.gov.np', 'moewri.gov.np', 'moha.gov.np',
  // International
  'worldbank.org', 'adb.org', 'undp.org', 'who.int', 'unicef.org',
  'ilo.org', 'reliefweb.int', 'amnesty.org', 'hrw.org', 'icimod.org',
]);

// ---------------------------------------------------------------------------
// Extract domains/authors from recent signals
// ---------------------------------------------------------------------------

async function extractFrequentSources(dayWindow = 7): Promise<{
  domains: Map<string, { count: number; sampleUrls: string[]; sampleTitles: string[] }>;
  authors: Map<string, { count: number; sampleUrls: string[] }>;
}> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - dayWindow * 86400_000).toISOString();

  const { data: signals } = await supabase
    .from('intelligence_signals')
    .select('url, author, title, source_id')
    .gte('discovered_at', cutoff)
    .not('url', 'is', null)
    .limit(2000);

  const domains = new Map<string, { count: number; sampleUrls: string[]; sampleTitles: string[] }>();
  const authors = new Map<string, { count: number; sampleUrls: string[] }>();

  for (const sig of signals || []) {
    // Extract domain
    try {
      const domain = new URL(sig.url).hostname.replace('www.', '');
      if (!KNOWN_DOMAINS.has(domain)) {
        const entry = domains.get(domain) || { count: 0, sampleUrls: [], sampleTitles: [] };
        entry.count++;
        if (entry.sampleUrls.length < 3) entry.sampleUrls.push(sig.url);
        if (entry.sampleTitles.length < 3 && sig.title) entry.sampleTitles.push(sig.title);
        domains.set(domain, entry);
      }
    } catch {
      // invalid URL
    }

    // Track authors
    if (sig.author && sig.author.length > 3) {
      const entry = authors.get(sig.author) || { count: 0, sampleUrls: [] };
      entry.count++;
      if (entry.sampleUrls.length < 3) entry.sampleUrls.push(sig.url);
      authors.set(sig.author, entry);
    }
  }

  return { domains, authors };
}

// ---------------------------------------------------------------------------
// AI-powered source evaluation
// ---------------------------------------------------------------------------

async function evaluateSourceCandidate(
  candidate: { name: string; url: string; type: string; referenceCount: number; sampleTitles: string[] },
): Promise<SourceSuggestion | null> {
  const prompt = `You are analyzing a potential new intelligence source for a Nepal government commitment tracker.

Source: ${candidate.name}
URL: ${candidate.url}
Type: ${candidate.type}
Referenced ${candidate.referenceCount} times in recent signals
Sample content titles: ${candidate.sampleTitles.join('; ')}

The tracker monitors a live, evolving set of public government commitments across: Governance, Anti-Corruption, Economy, Infrastructure, Transport, Energy, Technology, Health, Education, Environment, Social.

Evaluate this source:
1. Is this source relevant to tracking Nepal government commitments? (yes/no)
2. What category? (politician/journalist/think_tank/international_org/news/government/commentary)
3. Which commitment areas does it cover? List IDs if known, or category names.
4. Confidence (0-1) that this is a valuable source worth adding
5. Brief reasoning (1-2 sentences)

Respond in JSON: { "relevant": true/false, "category": "...", "relatedAreas": [...], "confidence": 0.X, "reasoning": "..." }`;

  try {
    const systemPrompt = 'You evaluate potential intelligence sources for a Nepal government commitment tracker. Respond in valid JSON only.';
    const response = await aiComplete('classify', systemPrompt, prompt);
    const text = response.content || '';

    const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    if (!json.relevant) return null;

    return {
      suggestedId: `discovered-${candidate.url.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)}`,
      name: candidate.name,
      sourceType: candidate.type as SourceSuggestion['sourceType'],
      url: candidate.url,
      reasoning: json.reasoning,
      confidence: json.confidence,
      relatedPromiseIds: [],
      referenceCount: candidate.referenceCount,
      category: json.category,
      language: 'en',
      autoApprove: json.confidence >= 0.8 && candidate.referenceCount >= 5,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main discovery function — called at end of sweep
// ---------------------------------------------------------------------------

export async function discoverNewSources(options?: {
  dayWindow?: number;
  minReferences?: number;
  maxSuggestions?: number;
}): Promise<{
  candidatesFound: number;
  suggestionsCreated: number;
  autoApproved: number;
  suggestions: SourceSuggestion[];
}> {
  const dayWindow = options?.dayWindow ?? 7;
  const minReferences = options?.minReferences ?? 3;
  const maxSuggestions = options?.maxSuggestions ?? 10;

  const { domains, authors } = await extractFrequentSources(dayWindow);

  // Filter to domains with enough references
  const candidates = Array.from(domains.entries())
    .filter(([, info]) => info.count >= minReferences)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxSuggestions * 2); // evaluate more than we need

  const suggestions: SourceSuggestion[] = [];
  let autoApproved = 0;

  for (const [domain, info] of candidates) {
    if (suggestions.length >= maxSuggestions) break;

    const suggestion = await evaluateSourceCandidate({
      name: domain,
      url: `https://${domain}`,
      type: 'website',
      referenceCount: info.count,
      sampleTitles: info.sampleTitles,
    });

    if (suggestion) {
      suggestions.push(suggestion);
      if (suggestion.autoApprove) autoApproved++;
    }
  }

  // Store suggestions in database
  const supabase = getSupabase();
  for (const suggestion of suggestions) {
    await supabase.from('intelligence_sources').upsert(
      {
        id: suggestion.suggestedId,
        name: suggestion.name,
        source_type: suggestion.sourceType,
        url: suggestion.url,
        config: {
          discoveredBy: 'ai',
          reasoning: suggestion.reasoning,
          referenceCount: suggestion.referenceCount,
          category: suggestion.category,
        },
        priority: suggestion.autoApprove ? 5 : 3,
        related_promise_ids: suggestion.relatedPromiseIds,
        is_active: suggestion.autoApprove, // auto-activate high-confidence sources
      },
      { onConflict: 'id' },
    );
  }

  return {
    candidatesFound: candidates.length,
    suggestionsCreated: suggestions.length,
    autoApproved,
    suggestions,
  };
}

// ---------------------------------------------------------------------------
// Get pending source suggestions for admin review
// ---------------------------------------------------------------------------

export async function getPendingSourceSuggestions(): Promise<SourceSuggestion[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('intelligence_sources')
    .select('*')
    .eq('is_active', false)
    .not('config->discoveredBy', 'is', null)
    .order('priority', { ascending: false })
    .limit(20);

  return (data || []).map((row) => ({
    suggestedId: row.id,
    name: row.name,
    sourceType: row.source_type,
    url: row.url,
    reasoning: (row.config as Record<string, unknown>)?.reasoning as string || '',
    confidence: (row.priority || 3) / 10,
    relatedPromiseIds: row.related_promise_ids || [],
    referenceCount: (row.config as Record<string, unknown>)?.referenceCount as number || 0,
    category: (row.config as Record<string, unknown>)?.category as SourceSuggestion['category'] || 'news',
    language: 'en',
    autoApprove: false,
  }));
}
