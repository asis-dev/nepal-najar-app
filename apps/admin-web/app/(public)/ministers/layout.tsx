import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Cabinet Ministers — Weekly Activity',
  description: "What Nepal's cabinet ministers did this week. AI-verified signals, commitments, and accountability in real-time.",
  path: '/ministers',
  ogImage: `/api/og/minister?mode=dashboard&format=card`,
});

export default function MinistersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
