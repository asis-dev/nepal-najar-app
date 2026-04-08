/**
 * Services catalog — reads from Supabase with static fallback.
 * Mirrors the pattern used by lib/data/index.ts for promises.
 */

import { createClient } from '@supabase/supabase-js';
import type { Service, ServiceCategory } from './types';
import { SEED_SERVICES as CORE } from './seed-data';
import { EXTRA_SERVICES } from './seed-data-extra';
import { EXTRA_SERVICES_2 } from './seed-data-extra-2';
const SEED_SERVICES = [...CORE, ...EXTRA_SERVICES, ...EXTRA_SERVICES_2];

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

export async function searchServices(q: string, locale: 'en' | 'ne' = 'en'): Promise<Service[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const all = await getAllServices();
  return all
    .filter((s) => {
      const haystack = [
        s.title.en, s.title.ne,
        s.summary.en, s.summary.ne,
        s.providerName,
        ...s.tags,
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    })
    .slice(0, 25);
}
