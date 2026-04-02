import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({ title: 'Political Disputes', subtitle: "See who's disagreeing about what — and what they're saying." });

export const metadata = createMetadata({
  title: 'Disputes',
  description: "See who's disagreeing about what in Nepal politics — and what they're saying.",
  path: '/disputed',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function DisputedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
