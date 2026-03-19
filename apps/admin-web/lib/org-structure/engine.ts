import * as cheerio from 'cheerio';
import {
  publicGovUnits,
  type PublicGovUnit,
} from '@/lib/data/government-accountability';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export interface PublicGovSourceMeta {
  pageTitle: string | null;
  snippet: string | null;
  matchedTerms: string[];
  fetchedFrom: string;
  sourceStatus: 'verified' | 'fallback';
  checkedAt: string;
}

export interface PublicGovSnapshotUnit extends PublicGovUnit {
  sourceMeta: PublicGovSourceMeta;
}

const textFromHtml = ($: cheerio.CheerioAPI) =>
  $('body').text().replace(/\s+/g, ' ').trim();

function extractSnippet($: cheerio.CheerioAPI): string | null {
  const selectors = [
    'main p',
    '.entry-content p',
    '.page-content p',
    '.content p',
    '.post-content p',
    'article p',
  ];

  for (const selector of selectors) {
    const text = $(selector)
      .map((_, element) => $(element).text().trim())
      .get()
      .find((value) => value.length > 80);
    if (text) return text.slice(0, 240);
  }

  return null;
}

function buildTermMatches(unit: PublicGovUnit, text: string): string[] {
  const normalized = text.toLowerCase();
  const terms = [
    unit.name,
    unit.leadTitle,
    unit.scope,
    ...unit.promiseCategories,
  ];

  return terms.filter((term) => normalized.includes(term.toLowerCase())).slice(0, 6);
}

async function fetchSourceDocument(unit: PublicGovUnit): Promise<PublicGovSourceMeta> {
  const checkedAt = new Date().toISOString();
  const urls = [unit.sourceUrl, ...(unit.sourcePaths ?? []).map((path) =>
    path.startsWith('http') ? path : new URL(path, unit.sourceUrl).toString()
  )];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NepalNajar/1.0 (organization-tracker)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 3600 },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);
      const pageTitle = $('title').first().text().trim() || $('h1').first().text().trim() || null;
      const rawText = textFromHtml($);

      return {
        pageTitle,
        snippet: extractSnippet($),
        matchedTerms: buildTermMatches(unit, rawText),
        fetchedFrom: url,
        sourceStatus: 'verified',
        checkedAt,
      };
    } catch {
      continue;
    }
  }

  return {
    pageTitle: null,
    snippet: null,
    matchedTerms: [],
    fetchedFrom: unit.sourceUrl,
    sourceStatus: 'fallback',
    checkedAt,
  };
}

async function persistSnapshot(units: PublicGovSnapshotUnit[]) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabase();
    const rows = units.map((unit) => ({
      unit_id: unit.id,
      parent_id: unit.parentId ?? null,
      name: unit.name,
      name_ne: unit.nameNe,
      unit_type: unit.type,
      lead_title: unit.leadTitle,
      lead_name: unit.leadName,
      responsibility: unit.responsibility,
      scope: unit.scope,
      source_url: unit.sourceUrl,
      source_status: unit.sourceMeta.sourceStatus,
      source_title: unit.sourceMeta.pageTitle,
      source_snippet: unit.sourceMeta.snippet,
      source_checked_at: unit.sourceMeta.checkedAt,
      source_fetched_from: unit.sourceMeta.fetchedFrom,
      source_matches: unit.sourceMeta.matchedTerms,
      promise_categories: unit.promiseCategories,
      tracked_projects: unit.trackedProjects,
      achievements: unit.achievements,
    }));

    await supabase.from('government_org_units').upsert(rows, { onConflict: 'unit_id' });
  } catch {
    // Persistence is optional until the table exists.
  }
}

export async function buildGovernmentStructureSnapshot(): Promise<PublicGovSnapshotUnit[]> {
  const units = await Promise.all(
    publicGovUnits.map(async (unit) => ({
      ...unit,
      sourceMeta: await fetchSourceDocument(unit),
    }))
  );

  await persistSnapshot(units);
  return units;
}

export async function getGovernmentStructureSnapshot(): Promise<PublicGovSnapshotUnit[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('government_org_units')
        .select('*')
        .order('name');

      if (data && data.length > 0) {
        return data.map((row) => ({
          id: row.unit_id as string,
          parentId: (row.parent_id as string | null) ?? undefined,
          name: row.name as string,
          nameNe: row.name_ne as string,
          type: row.unit_type as PublicGovUnit['type'],
          leadTitle: row.lead_title as string,
          leadTitleNe: row.lead_title as string,
          leadName: row.lead_name as string,
          leadNameNe: row.lead_name as string,
          responsibility: row.responsibility as string,
          responsibilityNe: row.responsibility as string,
          scope: row.scope as string,
          scopeNe: row.scope as string,
          sourceUrl: row.source_url as string,
          promiseCategories: (row.promise_categories as PublicGovUnit['promiseCategories']) ?? [],
          trackedProjects: (row.tracked_projects as string[]) ?? [],
          achievements: (row.achievements as PublicGovUnit['achievements']) ?? [],
          sourceMeta: {
            pageTitle: (row.source_title as string | null) ?? null,
            snippet: (row.source_snippet as string | null) ?? null,
            matchedTerms: (row.source_matches as string[]) ?? [],
            fetchedFrom: (row.source_fetched_from as string) ?? (row.source_url as string),
            sourceStatus: (row.source_status as 'verified' | 'fallback') ?? 'fallback',
            checkedAt: (row.source_checked_at as string) ?? new Date().toISOString(),
          },
        }));
      }
    } catch {
      // fall through to live rebuild
    }
  }

  return buildGovernmentStructureSnapshot();
}
