/**
 * Services catalog — reads from Supabase with static fallback.
 * Mirrors the pattern used by lib/data/index.ts for promises.
 */

import { createClient } from '@supabase/supabase-js';
import type { Service, ServiceCategory } from './types';
import { SEED_SERVICES as CORE } from './seed-data';
import { EXTRA_SERVICES } from './seed-data-extra';
import { EXTRA_SERVICES_2 } from './seed-data-extra-2';
import { NAGARIK_SERVICES } from './seed-data-nagarik';
const SEED_SERVICES = [...CORE, ...EXTRA_SERVICES, ...EXTRA_SERVICES_2, ...NAGARIK_SERVICES];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'and', 'or', 'my', 'me', 'i', 'need', 'want',
  'get', 'help', 'with', 'how', 'do', 'can', 'is', 'in', 'on', 'at', 'from', 'please',
  'book', 'apply', 'make', 'start', 'issue', 'available', 'about', 'what', 'required',
  'needed', 'there', 'any', 'be', 'am', 'are', 'was', 'were',
]);

const TOKEN_SYNONYMS: Record<string, string[]> = {
  hospital: ['opd', 'doctor', 'clinic', 'health', 'appointment', 'ticket', 'admission', 'checkup'],
  appointment: ['book', 'slot', 'time', 'opd', 'visit', 'admission', 'queue'],
  doctor: ['hospital', 'opd', 'appointment', 'clinic', 'specialist', 'checkup'],
  admission: ['hospital', 'appointment', 'doctor', 'opd', 'bed'],
  checkup: ['hospital', 'doctor', 'opd', 'clinic', 'appointment'],
  license: ['licence', 'driving', 'dotm', 'renewal', 'trial', 'smart'],
  licence: ['license', 'driving', 'dotm', 'renewal', 'trial', 'smart'],
  renewal: ['renew', 'expire', 'extension'],
  renew: ['renewal', 'expire', 'extension'],
  passport: ['rahadani', 'emrtd'],
  citizenship: ['nagarikta'],
  bill: ['payment', 'pay', 'electricity', 'water', 'nea', 'kukl'],
  electricity: ['nea', 'bill', 'power'],
  water: ['kukl', 'bill', 'connection'],
  bank: ['account', 'kyc'],
  nagarik: ['nagarikapp', 'nagrik', 'citizen', 'digital', 'identity'],
  chalan: ['challan', 'fine', 'traffic', 'violation'],
  epf: ['provident', 'retirement', 'pension', 'contribution'],
  clearance: ['police', 'character', 'certificate'],
  voter: ['election', 'registration', 'vote'],
  neb: ['plus two', 'grade 12', 'board'],
  ssf: ['social security', 'contribution'],
  malpot: ['land revenue', 'land tax'],
  अस्पताल: ['hospital', 'opd', 'doctor', 'appointment', 'admission'],
  समय: ['appointment', 'slot', 'book'],
  टिकट: ['opd', 'hospital', 'appointment'],
  लाइसेन्स: ['license', 'renewal', 'driving'],
  बिल: ['bill', 'payment', 'nea', 'kukl'],
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function client() {
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToService(r: any): Service {
  return {
    id: r.id,
    slug: r.slug,
    category: r.category,
    providerType: r.provider_type,
    providerName: r.provider_name,
    title: { en: r.title_en, ne: r.title_ne },
    summary: { en: r.summary_en || '', ne: r.summary_ne || '' },
    estimatedTime: r.estimated_time ? safeParseBilingual(r.estimated_time) : undefined,
    feeRange: r.fee_range ? safeParseBilingual(r.fee_range) : undefined,
    officialUrl: r.official_url || undefined,
    documents: r.documents || [],
    steps: r.steps || [],
    offices: r.offices || [],
    commonProblems: r.common_problems || [],
    faqs: r.faqs || [],
    tags: r.tags || [],
    verifiedAt: r.verified_at || '',
  };
}

function safeParseBilingual(v: string) {
  try {
    const p = JSON.parse(v);
    if (p && typeof p === 'object' && 'en' in p && 'ne' in p) return p;
  } catch {}
  return { en: v, ne: v };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token) && token.length > 1);
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    for (const synonym of TOKEN_SYNONYMS[token] || []) expanded.add(synonym);
  }
  return [...expanded];
}

function includesAny(haystack: string, tokens: string[]): boolean {
  return tokens.some((token) => hasWholeWord(haystack, token));
}

function hasWholeWord(haystack: string, word: string): boolean {
  // For very short tokens (2-3 chars), require word boundary to avoid substring matches
  // e.g., "tax" in "taxi" should NOT match
  if (word.length <= 4) {
    const re = new RegExp(`(?:^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
    return re.test(` ${haystack} `);
  }
  return haystack.includes(word);
}

function scoreField(field: string, tokens: string[], weight: number): number {
  if (!field) return 0;
  let score = 0;
  for (const token of tokens) {
    if (hasWholeWord(field, token)) score += weight;
  }
  return score;
}

function scoreService(service: Service, query: string, locale: 'en' | 'ne') {
  const normalizedQuery = normalizeText(query);
  const tokens = expandTokens(tokenize(query));

  if (tokens.length === 0) return 0;

  const title = normalizeText(`${service.title.en} ${service.title.ne}`);
  const slug = normalizeText(service.slug);
  const provider = normalizeText(service.providerName);
  const summary = normalizeText(`${service.summary.en} ${service.summary.ne}`);
  const tags = normalizeText(service.tags.join(' '));
  const documents = normalizeText(
    service.documents
      .map((doc) => [doc.title.en, doc.title.ne, doc.notes?.en, doc.notes?.ne].filter(Boolean).join(' '))
      .join(' '),
  );
  const steps = normalizeText(
    service.steps
      .map((step) => [step.title.en, step.title.ne, step.detail.en, step.detail.ne].join(' '))
      .join(' '),
  );
  const offices = normalizeText(
    service.offices
      .map((office) => [office.name.en, office.name.ne, office.address.en, office.address.ne].join(' '))
      .join(' '),
  );
  const faqs = normalizeText(
    service.faqs
      .map((faq) => [faq.q.en, faq.q.ne, faq.a.en, faq.a.ne].join(' '))
      .join(' '),
  );
  const problems = normalizeText(
    service.commonProblems
      .map((problem) => [problem.problem.en, problem.problem.ne, problem.solution.en, problem.solution.ne].join(' '))
      .join(' '),
  );

  let score = 0;

  if (title.includes(normalizedQuery)) score += 120;
  if (slug.includes(normalizedQuery)) score += 100;
  if (tags.includes(normalizedQuery)) score += 80;
  if (summary.includes(normalizedQuery)) score += 40;

  score += scoreField(title, tokens, 18);
  score += scoreField(slug, tokens, 16);
  score += scoreField(tags, tokens, 14);
  score += scoreField(provider, tokens, 12);
  score += scoreField(summary, tokens, 9);
  score += scoreField(steps, tokens, 8);
  score += scoreField(documents, tokens, 6);
  score += scoreField(problems, tokens, 6);
  score += scoreField(faqs, tokens, 5);
  score += scoreField(offices, tokens, 4);

  const hospitalIntent = includesAny(normalizedQuery, [
    'hospital', 'opd', 'doctor', 'clinic', 'appointment', 'admission', 'checkup', 'bir', 'teaching', 'maternity', 'kanti', 'civil',
  ]);
  const licenseIntent = includesAny(normalizedQuery, [
    'license', 'licence', 'renewal', 'renew', 'dotm', 'driving', 'trial', 'लाइसेन्स', 'अनुमतिपत्र',
  ]);
  const billIntent = includesAny(normalizedQuery, [
    'bill', 'payment', 'pay', 'nea', 'electricity', 'kukl', 'water',
  ]);

  if (hospitalIntent) {
    if (service.providerType === 'hospital' || service.category === 'health') score += 90;
    if (includesAny(title, ['hospital', 'opd', 'doctor', 'bir', 'teaching', 'maternity', 'kanti', 'civil'])) score += 40;
    if (service.providerType !== 'hospital' && service.category !== 'health') score -= 30;
  }

  if (licenseIntent) {
    if (includesAny(slug, ['license', 'licence', 'trial'])) score += 80;
    if (service.category === 'transport') score += 30;
  }

  if (billIntent) {
    if (includesAny(slug, ['nea', 'kukl', 'bill'])) score += 80;
    if (service.category === 'utilities') score += 30;
  }

  if (locale === 'ne' && /[\u0900-\u097f]/.test(query) && /[\u0900-\u097f]/.test(service.title.ne)) {
    score += 5;
  }

  return score;
}

export async function getAllServices(): Promise<Service[]> {
  const c = client();
  if (!c) return SEED_SERVICES;
  const { data, error } = await c
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('popularity', { ascending: false });
  if (error || !data || data.length === 0) return SEED_SERVICES;
  return data.map(rowToService);
}

export async function getServicesByCategory(category: ServiceCategory): Promise<Service[]> {
  const all = await getAllServices();
  return all.filter((s) => s.category === category);
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const c = client();
  if (c) {
    const { data } = await c.from('services').select('*').eq('slug', slug).maybeSingle();
    if (data) return rowToService(data);
  }
  return SEED_SERVICES.find((s) => s.slug === slug) || null;
}

export async function rankServices(q: string, locale: 'en' | 'ne' = 'en'): Promise<Array<{ service: Service; score: number }>> {
  const needle = q.trim();
  if (!needle) return [];
  const all = await getAllServices();

  return all
    .map((service) => ({
      service,
      score: scoreService(service, needle, locale),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function searchServices(q: string, locale: 'en' | 'ne' = 'en'): Promise<Service[]> {
  const ranked = await rankServices(q, locale);
  return ranked.slice(0, 25).map((entry) => entry.service);
}
