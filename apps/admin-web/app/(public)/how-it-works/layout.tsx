import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | Nepal Najar',
  description:
    'Learn how Nepal Najar tracks government commitments using AI intelligence, community verification, and combined scoring. Nepal\'s citizen-powered accountability platform.',
  openGraph: {
    title: 'How Nepal Najar Works',
    description:
      'AI intelligence + community verification = the truth about every government commitment. See how Nepal\'s accountability platform works.',
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
