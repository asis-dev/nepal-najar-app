import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

function prettifySlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bodyName = prettifySlug(slug) || 'Government Body';

  const ogParams = new URLSearchParams({
    title: bodyName,
    subtitle: 'Body-level scorecard, commitment mix, and tracked delivery status.',
    section: 'scorecard',
  });

  return createMetadata({
    title: `${bodyName} Scorecard`,
    description:
      `${bodyName} scorecard with commitment-level accountability, progress breakdown, and public evidence tracking.`,
    path: `/scorecard/${slug}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function ScorecardDetailLayout({ children }: Props) {
  return children;
}

