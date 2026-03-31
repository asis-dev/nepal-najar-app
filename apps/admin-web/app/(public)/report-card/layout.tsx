import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Government Report Card | Nepal Republic',
  description:
    'Weekly government accountability report card — transparency score, what is working, what is not, and public voice on Nepal government commitments. सरकारी प्रगति रिपोर्ट कार्ड।',
  openGraph: {
    title: 'Government Report Card | Nepal Republic',
    description:
      'See how Nepal\'s government is performing — transparency scores, progress highlights, and citizen feedback.',
  },
};

export default function ReportCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
