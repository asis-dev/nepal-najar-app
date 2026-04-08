import type { MetadataRoute } from 'next';
import { promises } from '@/lib/data/promises';
import { publicGovUnits } from '@/lib/data/government-accountability';
import type { PromiseCategory } from '@/lib/data/promises';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';
import { PROVINCES, ALL_DISTRICTS } from '@/lib/seo/nepal-geo';
import { getAllOfficials, getAllTopics, STATUSES } from '@/lib/seo/seo-helpers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

function categoryToSlug(cat: PromiseCategory): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

const SECTOR_SLUGS = [
  'governance', 'anti-corruption', 'infrastructure', 'transport',
  'energy', 'technology', 'health', 'education', 'environment',
  'economy', 'social',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ──
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/explore/first-100-days`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/explore/map`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/report-card`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/sectors`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/government`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/scorecard`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/disputed`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/how-we-score`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/feedback`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/notifications`, lastModified: now, changeFrequency: 'weekly', priority: 0.55 },
    { url: `${SITE_URL}/watchlist`, lastModified: now, changeFrequency: 'weekly', priority: 0.65 },
    { url: `${SITE_URL}/complaints`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/corruption`, lastModified: now, changeFrequency: 'daily', priority: 0.75 },
    { url: `${SITE_URL}/ministers`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/inbox`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/petitions`, lastModified: now, changeFrequency: 'hourly', priority: 0.85 },
    { url: `${SITE_URL}/petitions/new`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/api-docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/me`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/moderation-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const publicPromises = promises.filter((p) => p.isPublic !== false);

  // ── /track/[category]/[slug] — one page per commitment ──
  const trackPages: MetadataRoute.Sitemap = publicPromises.map((p) => ({
    url: `${SITE_URL}/track/${categoryToSlug(p.category)}/${p.slug}`,
    lastModified: p.lastUpdate ? new Date(p.lastUpdate) : now,
    changeFrequency: 'weekly' as const,
    priority: p.status === 'in_progress' ? 0.8 : 0.7,
  }));

  // ── /faq/[slug] — FAQ page per commitment ──
  const faqPages: MetadataRoute.Sitemap = publicPromises.map((p) => ({
    url: `${SITE_URL}/faq/${p.slug}`,
    lastModified: p.lastUpdate ? new Date(p.lastUpdate) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }));

  // ── /sectors/[sector] — one page per category ──
  const sectorPages: MetadataRoute.Sitemap = SECTOR_SLUGS.map((slug) => ({
    url: `${SITE_URL}/sectors/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // ── /sectors/[sector]/[status] — sector × status cross-reference ──
  const sectorStatusPages: MetadataRoute.Sitemap = SECTOR_SLUGS.flatMap((sector) =>
    STATUSES.map((status) => ({
      url: `${SITE_URL}/sectors/${sector}/${status}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }))
  );

  // ── /status/[status] — status landing pages ──
  const statusPages: MetadataRoute.Sitemap = STATUSES.map((status) => ({
    url: `${SITE_URL}/status/${status}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // ── /government/[slug] — gov unit pages ──
  const governmentPages: MetadataRoute.Sitemap = publicGovUnits.map((unit) => ({
    url: `${SITE_URL}/government/${unit.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: unit.type === 'ministry' || unit.type === 'country' ? 0.75 : 0.65,
  }));

  // ── /province/[slug] — province overview pages ──
  const provincePages: MetadataRoute.Sitemap = PROVINCES.map((prov) => ({
    url: `${SITE_URL}/province/${prov.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // ── /province/[slug]/[sector] — province × sector ──
  const provinceSectorPages: MetadataRoute.Sitemap = PROVINCES.flatMap((prov) =>
    SECTOR_SLUGS.map((sector) => ({
      url: `${SITE_URL}/province/${prov.slug}/${sector}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }))
  );

  // ── /district/[slug] — district pages ──
  const districtPages: MetadataRoute.Sitemap = ALL_DISTRICTS.map((d) => ({
    url: `${SITE_URL}/district/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // ── /district/[slug]/[sector] — district × sector ──
  const districtSectorPages: MetadataRoute.Sitemap = ALL_DISTRICTS.flatMap((d) =>
    SECTOR_SLUGS.map((sector) => ({
      url: `${SITE_URL}/district/${d.slug}/${sector}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.45,
    }))
  );

  // ── /officials/[slug] — official profile pages ──
  const officials = getAllOfficials();
  const officialPages: MetadataRoute.Sitemap = officials.map((o) => ({
    url: `${SITE_URL}/officials/${o.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // ── /topics/[keyword] — topic aggregation pages ──
  const topics = getAllTopics();
  const topicPages: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${SITE_URL}/topics/${t.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: t.commitmentIds.length >= 3 ? 0.6 : 0.5,
  }));

  // ── Live DB commitment pages ──
  let commitmentPages: MetadataRoute.Sitemap = [];
  try {
    const commitments = (await getPromises()).filter((c) => isPublicCommitment(c));
    commitmentPages = commitments.flatMap((c) => {
      const lastModified = new Date(c.lastSignalAt || c.lastUpdate || c.publishedAt || now.toISOString());
      const key = c.slug || c.id;
      return [
        { url: `${SITE_URL}/explore/first-100-days/${key}`, lastModified, changeFrequency: 'daily' as const, priority: 0.72 },
        { url: `${SITE_URL}/scorecard/${key}`, lastModified, changeFrequency: 'daily' as const, priority: 0.68 },
      ];
    });
  } catch {
    commitmentPages = [];
  }

  // ── Petitions ──
  let petitionPages: MetadataRoute.Sitemap = [];
  try {
    const { getSupabase, isSupabaseConfigured } = await import('@/lib/supabase/server');
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('petitions')
        .select('slug, created_at')
        .eq('status', 'published')
        .limit(500);
      petitionPages = (data || []).map((p: any) => ({
        url: `${SITE_URL}/petitions/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: 'hourly' as const,
        priority: 0.75,
      }));
    }
  } catch {
    petitionPages = [];
  }

  return [
    ...staticPages,
    ...trackPages,
    ...faqPages,
    ...sectorPages,
    ...sectorStatusPages,
    ...statusPages,
    ...governmentPages,
    ...provincePages,
    ...provinceSectorPages,
    ...districtPages,
    ...districtSectorPages,
    ...officialPages,
    ...topicPages,
    ...commitmentPages,
    ...petitionPages,
  ];
}
