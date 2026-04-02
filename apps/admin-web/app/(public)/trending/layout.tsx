import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Trending',
  description: 'See what is trending in Nepal governance and civic accountability right now.',
  path: '/trending',
});

export default function TrendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
