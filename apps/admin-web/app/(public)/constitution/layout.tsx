import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({ title: 'Nepal Constitution 2015', subtitle: 'Browse all articles organized by part, with amendments tracked and commitments linked.' });

export const metadata = createMetadata({
  title: 'Nepal Constitution',
  description: 'Browse the Constitution of Nepal 2015 (संविधान २०७२) — all articles organized by part, with amendments tracked and commitments linked to constitutional provisions.',
  path: '/constitution',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function ConstitutionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
