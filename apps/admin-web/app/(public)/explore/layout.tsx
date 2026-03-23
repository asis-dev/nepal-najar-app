import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Explore Nepal Commitments',
  description: 'Track live public commitments, evidence, and accountability signals across Nepal.',
  path: '/explore',
});

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
