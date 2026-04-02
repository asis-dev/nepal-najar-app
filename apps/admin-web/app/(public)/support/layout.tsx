import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Support Us',
  description:
    'Support Nepal Republic — help keep this civic accountability platform free for everyone. Contribute via card, Apple Pay, or Google Pay.',
  path: '/support',
});

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
