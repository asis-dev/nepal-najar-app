import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | Nepal Republic',
  description:
    'Nepal Republic is an independent civic accountability platform tracking 109 government commitments with AI intelligence and community verification.',
  openGraph: {
    title: 'About Nepal Republic',
    description:
      'Public commitments. Public record. Learn how Nepal Republic tracks government accountability across 109 commitments using 80+ sources.',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
