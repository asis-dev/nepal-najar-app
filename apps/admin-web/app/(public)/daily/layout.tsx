import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Daily Promise',
  description: 'One government promise every day — track progress and build accountability habits.',
  path: '/daily',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
