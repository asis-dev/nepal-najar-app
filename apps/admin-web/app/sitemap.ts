import type { MetadataRoute } from 'next';
import { promises } from '@/lib/data/promises';
import { publicGovUnits } from '@/lib/data/government-accountability';
import type { PromiseCategory } from '@/lib/data/promises';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';

function categoryToSlug(cat: PromiseCategory): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

const SECTOR_SLUGS = [
  'governance',
  'anti-corruption',
  'infrastructure',
  'transport',
  'energy',
  'technology',
  'health',
  'education',
  'environment',
  'economy',
  'social',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/explore/first-100-days`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/explore/map`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/daily`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/report-card`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/sectors`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/government`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/explore/government`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // /track/[category]/[slug] — one page per commitment
  const commitmentPages: MetadataRoute.Sitemap = promises
    .filter((p) => p.isPublic !== false)
    .map((p) => ({
      url: `${SITE_URL}/track/${categoryToSlug(p.category)}/${p.slug}`,
      lastModified: p.lastUpdate ? new Date(p.lastUpdate) : now,
      changeFrequency: 'weekly' as const,
      priority: p.status === 'in_progress' ? 0.8 : 0.7,
    }));

  // /sectors/[sector] — one page per category
  const sectorPages: MetadataRoute.Sitemap = SECTOR_SLUGS.map((slug) => ({
    url: `${SITE_URL}/sectors/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // /government/[slug] — one page per gov unit
  const governmentPages: MetadataRoute.Sitemap = publicGovUnits.map((unit) => ({
    url: `${SITE_URL}/government/${unit.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: unit.type === 'ministry' || unit.type === 'country' ? 0.75 : 0.65,
  }));

  return [
    ...staticPages,
    ...sectorPages,
    ...governmentPages,
    ...commitmentPages,
  ];
}
