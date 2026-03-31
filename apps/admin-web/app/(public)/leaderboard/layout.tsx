import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard | Nepal Republic',
  description:
    'Community engagement leaderboard — see which provinces and citizens are most active in tracking Nepal government accountability. लिडरबोर्ड।',
  openGraph: {
    title: 'Leaderboard | Nepal Republic',
    description:
      'Rankings of provinces and citizens by civic engagement — proposals, reports, votes, and karma scores.',
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
