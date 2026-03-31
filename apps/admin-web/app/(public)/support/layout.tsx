import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Us | Nepal Republic',
  description:
    'Support Nepal Republic — help keep this civic accountability platform free for everyone. Contribute via card, Apple Pay, or Google Pay. सहयोग गर्नुहोस्।',
  openGraph: {
    title: 'Support Us | Nepal Republic',
    description:
      'Your contribution helps keep Nepal Republic free for all citizens tracking government accountability.',
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
