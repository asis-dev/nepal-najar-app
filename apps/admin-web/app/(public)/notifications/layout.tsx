import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Notifications',
  description:
    'Manage your notification preferences — push alerts, email digests, and province-specific updates on government commitments.',
  path: '/notifications',
});

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
