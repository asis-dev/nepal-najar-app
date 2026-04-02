import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Leaderboard',
  description:
    'Community engagement leaderboard — see which provinces and citizens are most active in Nepal government accountability.',
  path: '/leaderboard',
});

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
