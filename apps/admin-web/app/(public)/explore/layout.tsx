import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Explore 109 Government Commitments',
  description: 'Every promise monitored. Live evidence, accountability signals, and AI analysis across Nepal — powered by 80+ sources.',
  path: '/explore',
});

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
