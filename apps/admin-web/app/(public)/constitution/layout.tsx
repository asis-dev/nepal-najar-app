import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nepal Constitution | Nepal Republic',
  description:
    'Browse the Constitution of Nepal 2015 (संविधान २०७२) — all articles organized by part, with amendments tracked and commitments linked to constitutional provisions.',
  openGraph: {
    title: 'Nepal Constitution | Nepal Republic',
    description:
      'Explore the Constitution of Nepal 2015 with articles, amendments, and links to government commitments.',
  },
};

export default function ConstitutionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
