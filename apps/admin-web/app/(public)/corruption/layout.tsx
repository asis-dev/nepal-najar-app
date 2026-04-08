import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { getCorruptionStats } from '@/lib/data/corruption-data';
import { formatAmountNpr } from '@/lib/data/corruption-types';

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getCorruptionStats();
  const amount = formatAmountNpr(stats.totalAmountNpr);

  return createMetadata({
    title: 'Follow The Money — AI-Powered Corruption Intelligence',
    description: `रू ${amount} in corruption exposed. ${stats.totalCases} cases under the microscope — Lalita Niwas, Ncell tax, Wide Body & more. Who is under investigation, on trial, and convicted.`,
    path: '/corruption',
    ogImage: `/api/og/corruption?mode=dashboard&format=card`,
  });
}

export default function CorruptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
