import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Community Proposals',
  description:
    'Submit and vote on community development proposals for Nepal. Voice your demands, see progress, and hold leaders accountable.',
  path: '/proposals',
});

export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
