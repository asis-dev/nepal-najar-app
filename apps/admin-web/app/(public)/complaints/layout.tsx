import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Civic Issues | Nepal Republic',
  description:
    'Report and track civic issues in Nepal — roads, water, sanitation, electricity, and public services. AI-assisted routing with community follow-up. नागरिक समस्या ट्र्याकर।',
  openGraph: {
    title: 'Civic Issues | Nepal Republic',
    description:
      'Report local issues, track progress, and follow updates on roads, water, sanitation, and public services across Nepal.',
  },
};

export default function ComplaintsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
