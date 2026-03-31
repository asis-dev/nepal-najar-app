import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How We Score — Nepal Republic',
  description: 'Understand how the Republic Index is computed from 5 weighted metrics.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
