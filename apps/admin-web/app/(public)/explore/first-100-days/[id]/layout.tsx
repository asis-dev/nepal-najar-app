import type { Metadata } from 'next';
import { getPromiseBySlug, getPromiseById } from '@/lib/data/promises';
import { createMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promise = getPromiseBySlug(id) ?? getPromiseById(id);

  if (!promise) {
    return createMetadata({ title: 'Commitment Not Found' });
  }

  const statusLabel = promise.status === 'in_progress' ? 'In Progress'
    : promise.status === 'delivered' ? 'Delivered'
    : promise.status === 'stalled' ? 'Stalled'
    : 'Not Started';

  const title = promise.title;
  const subtitle = `${promise.progress}% ${statusLabel} — Verified by AI across public sources`;
  const description = promise.description || promise.summary || subtitle;

  const ogParams = new URLSearchParams({
    title,
    subtitle,
    progress: String(promise.progress),
    status: promise.status,
  });

  return createMetadata({
    title,
    description,
    path: `/explore/first-100-days/${promise.slug}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function PromiseDetailLayout({ children }: Props) {
  return children;
}
