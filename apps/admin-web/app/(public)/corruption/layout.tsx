import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { getCorruptionStats } from '@/lib/data/corruption-data';
import { formatAmountNpr } from '@/lib/data/corruption-types';

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getCorruptionStats();

  const amount = formatAmountNpr(stats.totalAmountNpr); // e.g. "339.0 Arab"
  const investigating = stats.casesByStatus?.under_investigation ?? 0;
  const onTrial = stats.casesByStatus?.trial ?? 0;
  const convicted = stats.casesByStatus?.convicted ?? 0;

  const ogParams = new URLSearchParams({
    title: `Follow The Money — रू ${amount} Exposed`,
    subtitle: `${investigating} under investigation · ${onTrial} on trial · ${convicted} convicted · AI-powered`,
    section: 'corruption',
  });

  return createMetadata({
    title: 'Follow The Money — AI-Powered Corruption Intelligence',
    description: `रू ${amount} in corruption exposed. ${stats.totalCases} cases under the microscope — Lalita Niwas, Ncell tax, Wide Body & more. Who is under investigation, on trial, and convicted.`,
    path: '/corruption',
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function CorruptionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
