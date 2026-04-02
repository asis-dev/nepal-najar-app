import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({ title: 'Civic Issues', subtitle: 'Report local issues — roads, water, sanitation, and public services. AI monitors resolution.', section: 'complaints' });

export const metadata = createMetadata({
  title: 'Civic Issues',
  description: 'Report civic issues in Nepal — roads, water, sanitation, electricity, and public services. AI-assisted routing with community follow-up. नागरिक समस्या रिपोर्ट।',
  path: '/complaints',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function ComplaintsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
