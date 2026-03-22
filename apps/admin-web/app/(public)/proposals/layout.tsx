import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Proposals — Nepal Najar',
  description:
    'Submit and vote on community development proposals for Nepal. Voice your demands, track progress, and hold leaders accountable.',
  openGraph: {
    title: 'Community Proposals — Nepal Najar',
    description:
      'Submit and vote on community development proposals for Nepal.',
    type: 'website',
  },
};

export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
