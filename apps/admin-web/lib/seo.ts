import type { Metadata } from 'next';

const SITE_NAME = 'Nepal Najar — नेपाल नजर';
const SITE_DESCRIPTION = 'जनताको नजरमा Balenको Nepal — The public eye on Balen\'s Nepal. Track development projects, government commitments, and progress across all 7 provinces.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';

export function createMetadata(overrides?: {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
}): Metadata {
  const title = overrides?.title
    ? `${overrides.title} | ${SITE_NAME}`
    : SITE_NAME;
  const description = overrides?.description || SITE_DESCRIPTION;
  const url = overrides?.path ? `${SITE_URL}${overrides.path}` : SITE_URL;
  const ogImage = overrides?.ogImage || `${SITE_URL}/api/og`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'ne_NP',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: [
      'Nepal',
      'development',
      'progress',
      'Balen',
      'government',
      'projects',
      'transparency',
      'accountability',
      'नेपाल',
      'विकास',
      'प्रगति',
      'पारदर्शिता',
      'Nepal Najar',
      'नेपाल नजर',
    ],
  };
}

/** Schema.org structured data for GovernmentService */
export function governmentServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: 'Nepal Najar',
    alternateName: 'नेपाल नजर',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    serviceArea: {
      '@type': 'Country',
      name: 'Nepal',
    },
    provider: {
      '@type': 'Organization',
      name: 'Nepal Najar',
    },
  };
}
