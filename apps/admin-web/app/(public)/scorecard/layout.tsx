import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Government Ministries — Nepal Republic',
  description:
    'What each ministry is supposed to do, and how they\'re performing. Ministry-level grades for Nepal.',
  openGraph: {
    title: 'Government Ministries — Nepal Republic',
    description:
      'What each ministry is supposed to do, and how they\'re performing.',
  },
};

export default function ScorecardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
