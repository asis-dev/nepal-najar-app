import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

function prettifyId(raw: string): string {
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const label = prettifyId(id) || 'Project';

  const ogParams = new URLSearchParams({
    title: label,
    subtitle: 'Track project progress, blockers, milestones, and delivery.',
    section: 'projects',
  });

  return createMetadata({
    title: `${label} Project`,
    description:
      'Track project milestones, blockers, and implementation progress with transparent accountability context.',
    path: `/explore/projects/${id}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

export default function ProjectDetailLayout({ children }: Props) {
  return children;
}

