import type { Metadata } from 'next';

const SITE_NAME = 'Nepal Republic — नेपाल रिपब्लिक';
const SITE_DESCRIPTION = 'Independent AI platform holding Nepal\'s government accountable. Commitment tracking, corruption monitoring, daily briefings, and verifiable evidence.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

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
  const rawOgImage = overrides?.ogImage || '/api/og';
  const ogImage = rawOgImage.startsWith('http') ? rawOgImage : `${SITE_URL}${rawOgImage}`;

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
      'Nepal government',
      'AI civic intelligence',
      'government accountability',
      'Nepal Republic',
      'नेपाल रिपब्लिक',
      'civic intelligence',
      'government accountability',
      'AI governance',
      'Nepal',
      'governance',
      'transparency',
      'corruption exposed',
      'civic complaints',
      'evidence verification',
      'नेपाल',
      'गणतन्त्र',
      'शासन',
      'पारदर्शिता',
      'AI नागरिक बुद्धिमत्ता',
    ],
  };
}

/** Schema.org structured data for GovernmentService */
export function governmentServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: 'Nepal Republic',
    alternateName: 'नेपाल रिपब्लिक',
    description: 'AI-powered civic intelligence platform for Nepal. Monitors government commitments, verifies evidence, and scores accountability.',
    url: SITE_URL,
    serviceArea: {
      '@type': 'Country',
      name: 'Nepal',
    },
    provider: {
      '@type': 'Organization',
      name: 'Nepal Republic',
    },
  };
}

/** Schema.org WebSite with SearchAction — helps AI models understand site structure */
export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nepal Republic',
    alternateName: ['नेपाल रिपब्लिक', 'Nepal Republic Civic Intelligence'],
    url: SITE_URL,
    description: 'Track promises. Report reality. Verify truth. Independent AI-powered civic intelligence for Nepal.',
    inLanguage: ['en', 'ne'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/explore/first-100-days?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nepal Republic',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    about: {
      '@type': 'Thing',
      name: 'Government accountability in Nepal',
      description: 'Monitoring government commitments, corruption cases, and minister activities using AI analysis across public sources.',
    },
  };
}

/** Schema.org Dataset — makes commitment data discoverable by AI models */
export function datasetSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Nepal Government Commitment Tracker',
    alternateName: 'Nepal Republic Commitment Database',
    description: 'Real-time tracking of Nepal government commitments with AI-assisted progress scoring grounded in publicly available evidence.',
    url: `${SITE_URL}/explore/first-100-days`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: {
      '@type': 'Organization',
      name: 'Nepal Republic',
      url: SITE_URL,
    },
    temporalCoverage: '2026-03-26/..',
    spatialCoverage: {
      '@type': 'Place',
      name: 'Nepal',
    },
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'Commitment Progress',
        unitText: 'percent',
        minValue: 0,
        maxValue: 100,
      },
      {
        '@type': 'PropertyValue',
        name: 'Republic Score Grade',
        description: 'Letter grade A-F based on commitment fulfillment',
      },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/plain',
      contentUrl: `${SITE_URL}/llms-full.txt`,
    },
    keywords: [
      'Nepal government',
      'government accountability',
      'commitment tracking',
      'civic intelligence',
      'AI governance monitoring',
      'Nepal politics',
      'RSP government',
    ],
  };
}
