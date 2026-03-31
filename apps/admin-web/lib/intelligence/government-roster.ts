/**
 * Government Roster Extractor
 *
 * Watches intelligence signals for cabinet appointments, reshuffles,
 * and ministerial changes. Extracts structured data and maintains
 * a live government_roster table in Supabase.
 *
 * Runs as part of the sweep pipeline after signal analysis.
 */

import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from './ai-router';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GovernmentOfficial {
  id?: string;
  name: string;
  nameNe: string | null;
  title: string;
  titleNe: string | null;
  ministry: string;
  ministrySlug: string | null;
  appointedDate: string | null;
  sourceSignalId: string | null;
  confidence: number;
  isCurrent: boolean;
}

interface SignalRow {
  id: string;
  title: string;
  content: string | null;
  content_summary: string | null;
  source_id: string;
  discovered_at: string;
  published_at: string | null;
}

interface AIAppointmentResult {
  appointments: {
    name: string;
    nameNe?: string;
    title: string;
    titleNe?: string;
    ministry: string;
    appointedDate?: string;
    type: 'appointment' | 'resignation' | 'reshuffle';
  }[];
}

// ── Patterns ─────────────────────────────────────────────────────────────────

const APPOINTMENT_PATTERNS_EN = [
  'appointed as',
  'sworn in as',
  'takes charge',
  'new minister',
  'cabinet reshuffle',
  'portfolio',
  'assigned to',
  'named as',
  'cabinet formation',
  'cabinet expansion',
  'ministry of',
  'took oath',
  'assumed office',
  'minister of state',
  'deputy minister',
  'state minister',
];

const APPOINTMENT_PATTERNS_NE = [
  'नियुक्त',
  'शपथ',
  'मन्त्रालय',
  'कार्यभार',
  'मन्त्रिपरिषद',
  'विभागीय',
  'मन्त्री',
  'राज्यमन्त्री',
  'सहायक मन्त्री',
  'पदभार',
  'नवनियुक्त',
  'कार्यवाहक',
];

// ── Ministry slug resolver ───────────────────────────────────────────────────
// Mirrors the ROLLUP map from government-bodies.ts for slug resolution

const MINISTRY_TO_SLUG: Record<string, string> = {
  'office of pm': 'opm',
  'office of the prime minister': 'opm',
  'prime minister': 'opm',
  'ministry of finance': 'finance',
  'ministry of law': 'law',
  'ministry of law & justice': 'law',
  'ministry of home affairs': 'home',
  'ministry of foreign affairs': 'foreign',
  'ministry of federal affairs': 'federal-affairs',
  'ministry of education': 'education',
  'ministry of health': 'health',
  'ministry of energy': 'energy',
  'ministry of water resources': 'energy',
  'ministry of industry': 'industry',
  'ministry of commerce': 'industry',
  'ministry of labour': 'industry',
  'ministry of communication': 'ict',
  'ministry of information': 'ict',
  'ministry of physical infrastructure': 'infrastructure',
  'ministry of transport': 'infrastructure',
  'ministry of urban development': 'urban',
  'ministry of agriculture': 'agriculture',
  'ministry of culture': 'tourism',
  'ministry of tourism': 'tourism',
  'ministry of forests': 'forests',
  'ministry of environment': 'forests',
  'ministry of women': 'social',
  'ministry of youth': 'social',
  'ministry of social welfare': 'social',
  ciaa: 'ciaa',
  'nepal rastra bank': 'nrb',
  'federal parliament': 'parliament',
  'election commission': 'parliament',
  'supreme court': 'judiciary',
};

function resolveMinistrySlug(ministry: string): string | null {
  const lower = ministry.toLowerCase().trim();
  // Direct match
  if (MINISTRY_TO_SLUG[lower]) return MINISTRY_TO_SLUG[lower];
  // Partial match
  for (const [key, slug] of Object.entries(MINISTRY_TO_SLUG)) {
    if (lower.includes(key) || key.includes(lower)) return slug;
  }
  return null;
}

// ── Cheap pattern filter ─────────────────────────────────────────────────────

function isAppointmentSignal(signal: SignalRow): boolean {
  const text = `${signal.title} ${signal.content || ''} ${signal.content_summary || ''}`.toLowerCase();
  return (
    APPOINTMENT_PATTERNS_EN.some((p) => text.includes(p)) ||
    APPOINTMENT_PATTERNS_NE.some((p) => text.includes(p))
  );
}

// ── AI extraction ────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are an expert on Nepali government structure. Extract government appointments from the given text.

Return ONLY valid JSON (no markdown). Format:
{
  "appointments": [
    {
      "name": "Full name in English",
      "nameNe": "Full name in Nepali (if available, null otherwise)",
      "title": "Official position (e.g. 'Minister of Finance', 'State Minister of Health')",
      "titleNe": "Position in Nepali (if available, null otherwise)",
      "ministry": "Ministry or body name (e.g. 'Ministry of Finance')",
      "appointedDate": "YYYY-MM-DD or null",
      "type": "appointment | resignation | reshuffle"
    }
  ]
}

Rules:
- Only extract REAL appointments/changes — not speculative or rumored
- Include the full official title, not abbreviations
- Map to standard Nepal ministry names
- If no appointments found, return {"appointments": []}
- Do not include party positions (e.g. "party chairman") — only government positions`;

async function extractAppointmentsFromSignal(
  signal: SignalRow,
): Promise<AIAppointmentResult['appointments']> {
  const text = `${signal.title}\n\n${signal.content || signal.content_summary || ''}`.slice(
    0,
    3000,
  );

  try {
    const response = await aiComplete(
      'extract',
      EXTRACTION_SYSTEM_PROMPT,
      `Extract government appointments from this signal (published ${signal.published_at || signal.discovered_at}):\n\n${text}`,
    );

    const jsonMatch = response.content.match(/\{[\s\S]*"appointments"[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as AIAppointmentResult;
    return parsed.appointments || [];
  } catch (err) {
    console.warn(
      `[Roster] Failed to extract from signal ${signal.id}:`,
      err instanceof Error ? err.message : 'unknown',
    );
    return [];
  }
}

// ── Database operations ──────────────────────────────────────────────────────

export async function upsertOfficial(
  official: Omit<GovernmentOfficial, 'id' | 'isCurrent'>,
): Promise<void> {
  const supabase = getSupabase();
  const slug = official.ministrySlug || resolveMinistrySlug(official.ministry);

  // Mark previous holder of this position as no longer current
  if (slug) {
    await supabase
      .from('government_roster')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('ministry_slug', slug)
      .eq('is_current', true)
      .neq('name', official.name);
  }

  // Upsert the new official
  const { error } = await supabase.from('government_roster').upsert(
    {
      name: official.name,
      name_ne: official.nameNe,
      title: official.title,
      title_ne: official.titleNe,
      ministry: official.ministry,
      ministry_slug: slug,
      appointed_date: official.appointedDate,
      source_signal_id: official.sourceSignalId,
      confidence: official.confidence,
      is_current: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ministry_slug,title', ignoreDuplicates: false },
  );

  if (error) {
    console.warn(`[Roster] Upsert failed for ${official.name}:`, error.message);
  }
}

export async function getCurrentRoster(): Promise<GovernmentOfficial[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('government_roster')
    .select('*')
    .eq('is_current', true)
    .order('ministry_slug');

  if (error) {
    console.warn('[Roster] Failed to fetch:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    nameNe: row.name_ne,
    title: row.title,
    titleNe: row.title_ne,
    ministry: row.ministry,
    ministrySlug: row.ministry_slug,
    appointedDate: row.appointed_date,
    sourceSignalId: row.source_signal_id,
    confidence: row.confidence,
    isCurrent: row.is_current,
  }));
}

export async function getMinisterForBody(
  bodySlug: string,
): Promise<GovernmentOfficial | null> {
  const roster = await getCurrentRoster();
  return roster.find((o) => o.ministrySlug === bodySlug) || null;
}

// ── Main extraction pipeline ─────────────────────────────────────────────────

export interface RosterExtractionResult {
  signalsScanned: number;
  appointmentSignals: number;
  appointmentsExtracted: number;
  officialsUpserted: number;
  errors: string[];
}

/**
 * Scan recent signals for government appointments and update the roster.
 * Called from sweep after signal analysis phase.
 */
export async function extractGovernmentRoster(
  sinceIso?: string,
): Promise<RosterExtractionResult> {
  const supabase = getSupabase();
  const result: RosterExtractionResult = {
    signalsScanned: 0,
    appointmentSignals: 0,
    appointmentsExtracted: 0,
    officialsUpserted: 0,
    errors: [],
  };

  // Fetch recent signals
  let query = supabase
    .from('intelligence_signals')
    .select('id, title, content, content_summary, source_id, discovered_at, published_at')
    .order('discovered_at', { ascending: false })
    .limit(500);

  if (sinceIso) {
    query = query.gte('discovered_at', sinceIso);
  } else {
    // Default: last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('discovered_at', weekAgo);
  }

  const { data: signals, error } = await query;
  if (error) {
    result.errors.push(`Failed to fetch signals: ${error.message}`);
    return result;
  }

  result.signalsScanned = (signals || []).length;

  // Filter for appointment-related signals (cheap pattern match)
  const appointmentSignals = (signals || []).filter(isAppointmentSignal);
  result.appointmentSignals = appointmentSignals.length;

  if (appointmentSignals.length === 0) {
    console.log('[Roster] No appointment signals found');
    return result;
  }

  console.log(
    `[Roster] Found ${appointmentSignals.length} appointment signals out of ${result.signalsScanned}`,
  );

  // Extract appointments via AI
  for (const signal of appointmentSignals) {
    try {
      const appointments = await extractAppointmentsFromSignal(signal as SignalRow);
      result.appointmentsExtracted += appointments.length;

      for (const appt of appointments) {
        if (appt.type === 'resignation') {
          // Mark as no longer current
          const slug = resolveMinistrySlug(appt.ministry);
          if (slug) {
            await supabase
              .from('government_roster')
              .update({ is_current: false, end_date: appt.appointedDate, updated_at: new Date().toISOString() })
              .eq('ministry_slug', slug)
              .ilike('name', `%${appt.name}%`)
              .eq('is_current', true);
          }
          result.officialsUpserted++;
          continue;
        }

        await upsertOfficial({
          name: appt.name,
          nameNe: appt.nameNe || null,
          title: appt.title,
          titleNe: appt.titleNe || null,
          ministry: appt.ministry,
          ministrySlug: resolveMinistrySlug(appt.ministry),
          appointedDate: appt.appointedDate || null,
          sourceSignalId: signal.id,
          confidence: 0.85,
        });
        result.officialsUpserted++;
      }

      // Rate limit between AI calls
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      result.errors.push(
        `Signal ${signal.id}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  console.log(
    `[Roster] Extracted ${result.appointmentsExtracted} appointments, upserted ${result.officialsUpserted} officials`,
  );

  return result;
}
