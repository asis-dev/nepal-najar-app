import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Corruption Tracker — Nepal Republic',
  description:
    'Tracking corruption cases, investigations, and accountability across Nepal\'s government.',
  openGraph: {
    title: 'Corruption Tracker — Nepal Republic',
    description: 'Tracking corruption cases, investigations, and accountability across Nepal\'s government.',
  },
};

export default function CorruptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
