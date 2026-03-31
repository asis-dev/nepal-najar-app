import type { MetadataRoute } from 'next';
import { promises } from '@/lib/data/promises';
import { publicGovUnits } from '@/lib/data/government-accountability';
import type { PromiseCategory } from '@/lib/data/promises';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${SITE_URL}/scorecard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/disputed`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/how-we-score`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/feedback`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/trending`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/leaderboard`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/notifications`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.55,
    },
    {
      url: `${SITE_URL}/watchlist`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: `${SITE_URL}/complaints`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // /track/[category]/[slug] — one page per commitment (static data)
  const trackPages: MetadataRoute.Sitemap = promises
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

  // /explore/first-100-days/[id] and /scorecard/[id] — live DB commitment pages
  let commitmentPages: MetadataRoute.Sitemap = [];
  try {
    const commitments = (await getPromises())
      .filter((commitment) => isPublicCommitment(commitment));

    commitmentPages = commitments.flatMap((commitment) => {
      const lastModifiedValue =
        commitment.lastSignalAt ||
        commitment.lastUpdate ||
        commitment.publishedAt ||
        now.toISOString();
      const lastModified = new Date(lastModifiedValue);
      const detailKey = commitment.slug || commitment.id;

      return [
        {
          url: `${SITE_URL}/explore/first-100-days/${detailKey}`,
          lastModified,
          changeFrequency: 'daily' as const,
          priority: 0.72,
        },
        {
          url: `${SITE_URL}/scorecard/${detailKey}`,
          lastModified,
          changeFrequency: 'daily' as const,
          priority: 0.68,
        },
      ];
    });
  } catch {
    commitmentPages = [];
  }

  return [
    ...staticPages,
    ...sectorPages,
    ...governmentPages,
    ...trackPages,
    ...commitmentPages,
  ];
}
