import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

function statusLabel(status?: string) {
  if (!status) return 'Open';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function compactText(value?: string, max = 180) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('community_proposals')
      .select('title, title_ne, description, description_ne, status, upvote_count, province')
      .eq('id', id)
      .single();

    if (!data) {
      return createMetadata({ title: 'Proposal Not Found', path: `/proposals/${id}` });
    }

    const title = String(data.title_ne || data.title || 'Community Proposal');
    const subtitle = `${statusLabel(data.status)} · ${Number(data.upvote_count || 0)} support votes${data.province ? ` · ${data.province}` : ''}`;
    const description = compactText(String(data.description_ne || data.description || subtitle), 220);

    const ogParams = new URLSearchParams({
      title,
      subtitle,
      section: 'proposals',
    });

    return createMetadata({
      title,
      description,
      path: `/proposals/${id}`,
      ogImage: `/api/og?${ogParams.toString()}`,
    });
  } catch {
    return createMetadata({
      title: 'Community Proposal',
      description: 'Community proposal on Nepal Republic — track support, discussion, and progress.',
      path: `/proposals/${id}`,
      ogImage: '/api/og?section=proposals',
    });
  }
}

export default function ProposalDetailLayout({ children }: Props) {
  return children;
}
