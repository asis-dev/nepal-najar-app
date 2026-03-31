import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'First 100 Days — All Commitments',
  description:
    'Browse all 109 government commitments with progress tracking, evidence links, and AI-classified signals.',
  path: '/explore/first-100-days',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
