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

  const title = `${promise.title_ne} — ${promise.title}`;
  const description = promise.description_ne || promise.description;
  const ogParams = new URLSearchParams({
    title: promise.title_ne,
    subtitle: promise.title,
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
