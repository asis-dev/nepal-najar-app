import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Daily Activity',
  description: 'Daily summary of Nepal government activity. AI-generated brief with audio narration covering policy, corruption, and civic issues.',
  path: '/daily',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
