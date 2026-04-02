import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'How It Works',
  description:
    'Learn how Nepal Republic monitors government commitments using AI intelligence, community verification, and evidence-grounded scoring.',
  path: '/how-it-works',
});

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
