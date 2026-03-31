import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Watchlist | Nepal Republic',
  description:
    'Track the government commitments you care about — see daily activity, signals, and progress updates for your saved commitments. मेरो वाचलिस्ट।',
  openGraph: {
    title: 'My Watchlist | Nepal Republic',
    description:
      'Your personal watchlist of government commitments with daily activity tracking and signal updates.',
  },
};

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
