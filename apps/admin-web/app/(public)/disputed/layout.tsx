import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disputes — Nepal Republic',
  description:
    "See who's disagreeing about what in Nepal politics — and what they're saying.",
  openGraph: {
    title: 'Disputes — Nepal Republic',
    description: "Political disputes on Nepal government commitments.",
  },
};

export default function DisputedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
