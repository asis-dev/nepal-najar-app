import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Search',
  description: 'Search across all government commitments, evidence, and news coverage.',
  path: '/search',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
