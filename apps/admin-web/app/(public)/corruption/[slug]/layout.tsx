import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { getCorruptionCase } from '@/lib/data/corruption-data';
import { formatAmountNpr } from '@/lib/data/corruption-types';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

function compactText(value?: string, max = 180) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function label(value?: string | null) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCorruptionCase(slug);

  if (!data.case) {
    return createMetadata({ title: 'Case Not Found', path: `/corruption/${slug}` });
  }

  const c = data.case;
  const title = c.title;
  const amount = c.estimated_amount_npr
    ? `रू ${formatAmountNpr(c.estimated_amount_npr)}`
    : 'Amount under review';
  const subtitle = `${label(c.status)} · ${label(c.severity)} severity · ${amount}`;
  const description = compactText(c.summary || subtitle, 220);

  const ogParams = new URLSearchParams({
    title,
    subtitle,
    section: 'corruption',
  });

  return createMetadata({
    title,
    description,
    path: `/corruption/${slug}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function CorruptionCaseLayout({ children }: Props) {
  return children;
}
