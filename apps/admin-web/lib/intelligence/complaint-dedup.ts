/**
 * Complaint Duplicate Detection
 *
 * Two modes:
 * 1. findPotentialDuplicates() — full AI-powered scan against recent complaints (admin/API use)
 * 2. checkForDuplicateOnCreate() — lightweight check during complaint creation (fast, with timeout)
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';

export interface DuplicateMatch {
  complaintId: string;
  title: string;
  similarity_score: number;
  reasoning: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  confidence: number;
  reasoning: string;
  potentialDuplicates: DuplicateMatch[];
}

interface ComplaintInput {
  title?: string;
  description: string;
  issue_type?: string;
  municipality?: string | null;
  ward_number?: string | null;
  district?: string | null;
  province?: string | null;
}

interface CandidateRow {
  id: string;
  title: string;
  title_ne: string | null;
  description: string;
  description_ne: string | null;
  issue_type: string;
  municipality: string | null;
  ward_number: string | null;
  district: string | null;
  location_text: string | null;
  created_at: string;
}

function parseJson<T>(content: string): T | null {
  try {
    const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Compute word overlap ratio between two texts.
 * Returns 0-1 where 1 means all words in the shorter text appear in the longer.
 */
function wordOverlap(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const smaller = wordsA.size <= wordsB.size ? wordsA : wordsB;
  const larger = wordsA.size > wordsB.size ? wordsA : wordsB;

  let shared = 0;
  for (const word of smaller) {
    if (larger.has(word)) shared++;
  }

  return shared / smaller.size;
}

/**
 * Fetch recent open complaints in the same area with the same issue type.
 */
async function fetchCandidates(
  complaint: ComplaintInput,
  limit = 20,
): Promise<CandidateRow[]> {
  const db = getSupabase();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  let query = db
    .from('civic_complaints')
    .select('id, title, title_ne, description, description_ne, issue_type, municipality, ward_number, district, location_text, created_at')
    .gte('created_at', ninetyDaysAgo)
    .not('status', 'in', '("closed","rejected","duplicate")')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (complaint.issue_type) {
    query = query.eq('issue_type', complaint.issue_type);
  }

  // Location narrowing: municipality > district > province
  if (complaint.municipality) {
    query = query.eq('municipality', complaint.municipality);
  } else if (complaint.district) {
    query = query.eq('district', complaint.district);
  } else if (complaint.province) {
    query = query.eq('province', complaint.province);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[ComplaintDedup] Failed to fetch candidates:', error.message);
    return [];
  }

  return (data || []) as CandidateRow[];
}

/**
 * Full AI-powered duplicate detection.
 * Compares a complaint against recent open complaints in the same area.
 */
export async function findPotentialDuplicates(
  complaint: ComplaintInput,
): Promise<DuplicateMatch[]> {
  const candidates = await fetchCandidates(complaint, 20);
  if (candidates.length === 0) return [];

  const candidateSummaries = candidates
    .map(
      (c, i) =>
        `[${i + 1}] ID: ${c.id}\n    Title: ${c.title}\n    Description: ${c.description?.slice(0, 200) || '(none)'}\n    Location: ${c.municipality || ''} ${c.ward_number ? `Ward ${c.ward_number}` : ''} ${c.district || ''}\n    Created: ${c.created_at}`,
    )
    .join('\n\n');

  const systemPrompt = `You are a duplicate complaint detector for a Nepal civic accountability platform.
Compare the NEW complaint against each EXISTING complaint. For each, determine if they describe the same physical problem at the same location.

Return JSON array only:
[
  { "index": 1, "similarity_score": 0.0, "reasoning": "short reason" },
  ...
]

Rules:
- similarity_score 0.0 to 1.0
- 1.0 = exact same complaint (same location, same problem, same root cause)
- 0.8+ = very likely duplicate (same area, same issue, same timeframe)
- 0.6-0.8 = possibly related (similar problem, nearby location)
- Below 0.6 = not a duplicate
- Same issue_type alone is NOT enough — must be same specific problem/location
- Consider Nepali and English text together
- Only include entries with similarity_score >= 0.6`;

  const userPrompt = `NEW COMPLAINT:
Title: ${complaint.title || '(none)'}
Description: ${complaint.description}
Issue type: ${complaint.issue_type || '(unknown)'}
Location: ${complaint.municipality || ''} ${complaint.ward_number ? `Ward ${complaint.ward_number}` : ''} ${complaint.district || ''}

EXISTING COMPLAINTS:
${candidateSummaries}`;

  try {
    const ai = await aiComplete('classify', systemPrompt, userPrompt);
    const parsed = parseJson<Array<{ index: number; similarity_score: number; reasoning: string }>>(
      ai.content,
    );

    if (!Array.isArray(parsed)) return [];

    const matches: DuplicateMatch[] = [];
    for (const item of parsed) {
      const score = typeof item.similarity_score === 'number' ? item.similarity_score : 0;
      if (score < 0.6) continue;

      const idx = (item.index ?? 0) - 1;
      const candidate = candidates[idx];
      if (!candidate) continue;

      matches.push({
        complaintId: candidate.id,
        title: candidate.title,
        similarity_score: Math.round(score * 100) / 100,
        reasoning: typeof item.reasoning === 'string' ? item.reasoning : 'No reasoning provided.',
      });
    }

    return matches.sort((a, b) => b.similarity_score - a.similarity_score);
  } catch (err) {
    console.warn(
      '[ComplaintDedup] AI duplicate check failed:',
      err instanceof Error ? err.message : 'unknown',
    );
    return [];
  }
}

/**
 * Lightweight duplicate check called during complaint creation.
 * Uses text overlap pre-filter before calling AI (only if overlap > 40%).
 * Has a timeout to avoid blocking creation.
 */
export async function checkForDuplicateOnCreate(
  complaint: ComplaintInput,
): Promise<DuplicateCheckResult> {
  const noMatch: DuplicateCheckResult = {
    isDuplicate: false,
    confidence: 0,
    reasoning: 'No duplicates detected.',
    potentialDuplicates: [],
  };

  try {
    const candidates = await fetchCandidates(complaint, 20);
    if (candidates.length === 0) return noMatch;

    // Text overlap pre-filter
    const newText = `${complaint.title || ''} ${complaint.description}`;
    const highOverlapCandidates = candidates.filter((c) => {
      const existingText = `${c.title || ''} ${c.description || ''} ${c.title_ne || ''} ${c.description_ne || ''}`;
      return wordOverlap(newText, existingText) > 0.4;
    });

    if (highOverlapCandidates.length === 0) return noMatch;

    // AI confirmation with timeout
    const candidateSummaries = highOverlapCandidates
      .slice(0, 5) // limit to top 5 for speed
      .map(
        (c, i) =>
          `[${i + 1}] ID: ${c.id} | Title: ${c.title} | Desc: ${c.description?.slice(0, 150) || '(none)'} | Location: ${c.municipality || ''} ${c.ward_number ? `Ward ${c.ward_number}` : ''}`,
      )
      .join('\n');

    const systemPrompt = `You detect duplicate civic complaints in Nepal. Compare the new complaint to candidates.

Return JSON only:
{
  "matches": [
    { "index": 1, "similarity_score": 0.0, "reasoning": "short reason" }
  ]
}

Rules:
- Only include matches with similarity_score >= 0.6
- 0.8+ = confident duplicate, 0.6-0.8 = possible duplicate
- Same issue type alone is NOT enough — must be same specific problem at same location`;

    const userPrompt = `NEW: ${complaint.title || ''} — ${complaint.description.slice(0, 300)}
Location: ${complaint.municipality || ''} ${complaint.ward_number ? `Ward ${complaint.ward_number}` : ''} ${complaint.district || ''}
Type: ${complaint.issue_type || 'unknown'}

CANDIDATES:
${candidateSummaries}`;

    const aiPromise = aiComplete('classify', systemPrompt, userPrompt);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));

    const result = await Promise.race([aiPromise, timeoutPromise]);
    if (!result) {
      console.warn('[ComplaintDedup] AI check timed out, skipping duplicate detection.');
      return noMatch;
    }

    const parsed = parseJson<{ matches: Array<{ index: number; similarity_score: number; reasoning: string }> }>(
      result.content,
    );

    if (!parsed?.matches || !Array.isArray(parsed.matches)) return noMatch;

    const potentialDuplicates: DuplicateMatch[] = [];
    for (const item of parsed.matches) {
      const score = typeof item.similarity_score === 'number' ? item.similarity_score : 0;
      if (score < 0.6) continue;

      const idx = (item.index ?? 0) - 1;
      const candidate = highOverlapCandidates[idx];
      if (!candidate) continue;

      potentialDuplicates.push({
        complaintId: candidate.id,
        title: candidate.title,
        similarity_score: Math.round(score * 100) / 100,
        reasoning: typeof item.reasoning === 'string' ? item.reasoning : '',
      });
    }

    potentialDuplicates.sort((a, b) => b.similarity_score - a.similarity_score);

    if (potentialDuplicates.length === 0) return noMatch;

    const topMatch = potentialDuplicates[0];
    return {
      isDuplicate: topMatch.similarity_score >= 0.8,
      duplicateOf: topMatch.similarity_score >= 0.8 ? topMatch.complaintId : undefined,
      confidence: topMatch.similarity_score,
      reasoning: topMatch.reasoning,
      potentialDuplicates,
    };
  } catch (err) {
    console.warn(
      '[ComplaintDedup] Duplicate check failed, proceeding without:',
      err instanceof Error ? err.message : 'unknown',
    );
    return noMatch;
  }
}
