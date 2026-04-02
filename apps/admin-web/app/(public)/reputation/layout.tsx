import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Reputation',
  description:
    'Your community reputation and karma — see your level, evidence contributions, verifications, and progress toward becoming a verifier.',
  path: '/reputation',
});

export default function ReputationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
