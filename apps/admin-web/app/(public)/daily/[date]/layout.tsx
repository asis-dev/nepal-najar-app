import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ date: string }>;
  children: React.ReactNode;
}

function formatDateLabel(dateParam: string): string {
  const [y, m, d] = dateParam.split('-').map(Number);
  if (!y || !m || !d) return dateParam;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return dateParam;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const label = formatDateLabel(date);

  const ogParams = new URLSearchParams({
    title: `${label} — Daily Activity`,
    subtitle: 'Signals, evidence, and accountability changes from this day.',
    section: 'daily',
  });

  return createMetadata({
    title: `${label} Daily Activity`,
    description:
      `Daily activity feed for ${label}: new signals, evidence updates, and verified government accountability movement in Nepal.`,
    path: `/daily/${date}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function DailyDateLayout({ children }: Props) {
  return children;
}

