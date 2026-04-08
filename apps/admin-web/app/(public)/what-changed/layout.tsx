import { createMetadata } from '@/lib/seo';

const ogParams = new URLSearchParams({
  title: 'What Changed?',
  subtitle: 'Recent updates, new issues, and verified changes across Nepal tracker.',
  section: 'what-changed',
});

export const metadata = createMetadata({
  title: 'What Changed?',
  description:
    'Recent updates, newly detected issues, and verified status changes across Nepal commitments and accountability signals.',
  path: '/what-changed',
  ogImage: `/api/og?${ogParams.toString()}`,
});

export default function WhatChangedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

