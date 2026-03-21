import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Analytics',
  description: 'Data-driven analysis of government promise delivery across all sectors.',
  path: '/explore/analytics',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
