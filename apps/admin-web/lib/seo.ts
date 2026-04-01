import type { Metadata } from 'next';

const SITE_NAME = 'Nepal Republic — नेपाल रिपब्लिक';
const SITE_DESCRIPTION = 'Independent AI platform holding Nepal\'s government accountable. 109 commitments monitored. Exposed corruption. Daily briefings. Real evidence.';
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
