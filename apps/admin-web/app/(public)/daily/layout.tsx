import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Daily Activity',
  description: 'See which public commitments moved today, what stalled, and what signals were detected.',
  path: '/daily',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
