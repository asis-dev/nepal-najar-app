import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trending — Nepal Najar',
  description: 'See what\'s trending in Nepal politics right now',
  openGraph: {
    title: 'Trending — Nepal Najar',
    description: 'See what\'s trending in Nepal politics right now',
  },
};

export default function TrendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
