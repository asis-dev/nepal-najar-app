import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Cabinet Ministers — Weekly Activity',
  description: "Track what Nepal's cabinet ministers did this week. See their signals, commitments, and activity in real-time.",
  path: '/ministers',
});

export default function MinistersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
