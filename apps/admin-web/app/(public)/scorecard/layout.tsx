import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({ title: 'Government Ministries', subtitle: "What each ministry is supposed to do, and how they're performing." });

export const metadata = createMetadata({
  title: 'Government Ministries',
  description: "What each ministry is supposed to do, and how they're performing. Ministry-level grades for Nepal.",
  path: '/scorecard',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function ScorecardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
