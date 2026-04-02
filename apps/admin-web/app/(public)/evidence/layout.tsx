import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Evidence Vault',
  description:
    'Verified archive of statements, commitments, and claims by Nepal\'s leaders and officials. Who said what, when — with sources.',
  path: '/evidence',
});

export default function EvidenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
