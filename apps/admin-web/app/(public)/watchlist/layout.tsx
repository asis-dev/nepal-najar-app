import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'My Watchlist',
  description:
    'Monitor the government commitments you care about — see daily activity, signals, and progress updates for your saved commitments.',
  path: '/watchlist',
});

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
