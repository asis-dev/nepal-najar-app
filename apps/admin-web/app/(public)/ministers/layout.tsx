import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({
  title: 'Cabinet Ministers',
  subtitle: "What Nepal's ministers did this week — signals, commitments, and AI-verified activity.",
  section: 'report',
});

export const metadata = createMetadata({
  title: 'Cabinet Ministers — Weekly Activity',
  description: "What Nepal's cabinet ministers did this week. AI-verified signals, commitments, and accountability in real-time.",
  path: '/ministers',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function MinistersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
