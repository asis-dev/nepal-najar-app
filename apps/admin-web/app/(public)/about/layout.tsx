import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'About',
  description:
    'Nepal Republic is an independent AI-powered civic intelligence platform monitoring government commitments with public evidence and community verification.',
  path: '/about',
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
