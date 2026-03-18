import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Explore Nepal Development',
  description: 'Track development projects, government promises, and progress across all 7 provinces of Nepal. Real-time transparency for every citizen.',
  path: '/explore',
});

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
