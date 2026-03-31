import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reputation | Nepal Republic',
  description:
    'Your community reputation and karma — track your level, evidence contributions, verifications, and progress toward becoming a verifier. प्रतिष्ठा र कर्म।',
  openGraph: {
    title: 'Reputation | Nepal Republic',
    description:
      'Track your civic karma, level progress, and contributions to Nepal Republic community verification.',
  },
};

export default function ReputationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
