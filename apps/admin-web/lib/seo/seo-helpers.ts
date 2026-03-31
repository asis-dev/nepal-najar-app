/**
 * Shared helpers for programmatic SEO page generation
 */

import { promises, type PromiseCategory, type GovernmentPromise, computeStats } from '@/lib/data/promises';
import { PROMISES_KNOWLEDGE, type PromiseKnowledge } from '@/lib/intelligence/knowledge-base';
import { PROVINCES, ALL_DISTRICTS, type Province, type District } from './nepal-geo';

/* ─── Category helpers ─── */

export const CATEGORIES: PromiseCategory[] = [
  'Governance', 'Anti-Corruption', 'Infrastructure', 'Transport',
  'Energy', 'Technology', 'Health', 'Education', 'Environment',
  'Economy', 'Social',
];

export const CATEGORY_NE: Record<string, string> = {
  Governance: 'शासन',
  'Anti-Corruption': 'भ्रष्टाचार विरोधी',
  Infrastructure: 'पूर्वाधार',
  Transport: 'यातायात',
  Energy: 'ऊर्जा',
  Technology: 'प्रविधि',
  Health: 'स्वास्थ्य',
  Education: 'शिक्षा',
  Environment: 'वातावरण',
  Economy: 'अर्थतन्त्र',
  Social: 'सामाजिक',
};

export function categoryToSlug(cat: string): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

export function slugToCategory(slug: string): PromiseCategory | undefined {
  return CATEGORIES.find((c) => categoryToSlug(c) === slug);
}

/* ─── Status helpers ─── */

export const STATUSES = ['not_started', 'in_progress', 'delivered', 'stalled'] as const;
export type PromiseStatus = (typeof STATUSES)[number];

export const STATUS_META: Record<string, { label: string; labelNe: string; description: string }> = {
  not_started: {
    label: 'Not Started',
    labelNe: 'सुरु भएको छैन',
    description: 'Government commitments that have not yet begun implementation',
  },
  in_progress: {
    label: 'In Progress',
    labelNe: 'प्रगतिमा',
    description: 'Commitments currently being implemented with measurable progress',
  },
  delivered: {
    label: 'Delivered',
    labelNe: 'पूरा भयो',
    description: 'Commitments that have been successfully completed and verified',
  },
  stalled: {
    label: 'Stalled',
    labelNe: 'रोकिएको',
    description: 'Commitments that have stopped making progress and need attention',
  },
};

/* ─── Data access ─── */

export function getPublicPromises(): GovernmentPromise[] {
  return promises.filter((p) => p.isPublic !== false);
}

export function getPromisesByStatus(status: string): GovernmentPromise[] {
  return getPublicPromises().filter((p) => p.status === status);
}

export function getPromisesBySector(category: PromiseCategory): GovernmentPromise[] {
  return getPublicPromises().filter((p) => p.category === category);
}

export function getPromisesByProvince(provinceName: string): GovernmentPromise[] {
  const pub = getPublicPromises();
  // National-scope commitments affect all provinces
  return pub.filter(
    (p) =>
      !p.affectedProvinces ||
      p.affectedProvinces.length === 0 ||
      p.affectedProvinces.some(
        (ap) => ap.toLowerCase() === provinceName.toLowerCase()
      )
  );
}

export function getKnowledge(promiseId: string | number): PromiseKnowledge | undefined {
  return PROMISES_KNOWLEDGE.find((k) => k.id === Number(promiseId));
}

/* ─── Official extraction ─── */

export interface OfficialProfile {
  slug: string;
  name: string;
  commitmentIds: number[];
  ministries: string[];
}

let _cachedOfficials: OfficialProfile[] | null = null;

export function getAllOfficials(): OfficialProfile[] {
  if (_cachedOfficials) return _cachedOfficials;

  const officialMap = new Map<string, { commitmentIds: Set<number>; ministries: Set<string> }>();

  for (const k of PROMISES_KNOWLEDGE) {
    for (const name of k.keyOfficials) {
      const existing = officialMap.get(name) || { commitmentIds: new Set(), ministries: new Set() };
      existing.commitmentIds.add(k.id);
      k.keyMinistries.forEach((m) => existing.ministries.add(m));
      officialMap.set(name, existing);
    }
  }

  _cachedOfficials = Array.from(officialMap.entries())
    .map(([name, data]) => ({
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-'),
      name,
      commitmentIds: Array.from(data.commitmentIds).sort((a, b) => a - b),
      ministries: Array.from(data.ministries),
    }))
    .sort((a, b) => b.commitmentIds.length - a.commitmentIds.length);

  return _cachedOfficials;
}

/* ─── Keyword/topic extraction ─── */

export interface TopicPage {
  slug: string;
  keyword: string;
  commitmentIds: string[];
}

let _cachedTopics: TopicPage[] | null = null;

export function getAllTopics(): TopicPage[] {
  if (_cachedTopics) return _cachedTopics;

  // Import keywords from knowledge base aspects + promise data
  const topicMap = new Map<string, Set<string>>();
  const pub = getPublicPromises();

  for (const p of pub) {
    // Extract topics from title words
    const titleWords = p.title
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (const word of titleWords) {
      if (['will', 'with', 'from', 'that', 'this', 'have', 'been', 'into', 'each', 'year', 'within'].includes(word)) continue;
      const existing = topicMap.get(word) || new Set();
      existing.add(p.id);
      topicMap.set(word, existing);
    }

    // Extract topics from category
    const catSlug = categoryToSlug(p.category);
    const catSet = topicMap.get(catSlug) || new Set();
    catSet.add(p.id);
    topicMap.set(catSlug, catSet);
  }

  // Add knowledge base key aspects as topics
  for (const k of PROMISES_KNOWLEDGE) {
    const aspects = k.keyAspects.split(',').map((a) => a.trim().toLowerCase());
    for (const aspect of aspects) {
      const slug = aspect.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
      if (slug.length < 3 || slug.length > 60) continue;
      const existing = topicMap.get(slug) || new Set();
      existing.add(String(k.id));
      topicMap.set(slug, existing);
    }
  }

  _cachedTopics = Array.from(topicMap.entries())
    .filter(([, ids]) => ids.size >= 1) // at least 1 commitment
    .map(([keyword, ids]) => ({
      slug: keyword.replace(/[^a-z0-9-]/g, '').slice(0, 60),
      keyword,
      commitmentIds: Array.from(ids),
    }))
    .filter((t) => t.slug.length >= 3)
    .sort((a, b) => b.commitmentIds.length - a.commitmentIds.length);

  return _cachedTopics;
}

/* ─── Stats helpers ─── */

export function computeSectorStats(category: PromiseCategory) {
  const sectorPromises = getPromisesBySector(category);
  return computeStats(sectorPromises);
}

export function computeProvinceStats(provinceName: string) {
  const provPromises = getPromisesByProvince(provinceName);
  return computeStats(provPromises);
}

export { computeStats, promises, PROMISES_KNOWLEDGE, PROVINCES, ALL_DISTRICTS };
export type { GovernmentPromise, PromiseKnowledge, Province, District };
