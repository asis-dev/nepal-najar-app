import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nepal Republic — Commitment Embed',
  robots: 'noindex, nofollow',
};

export default function CommitmentEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, padding: 0, background: 'transparent' }}>
      {children}
    </div>
  );
}
