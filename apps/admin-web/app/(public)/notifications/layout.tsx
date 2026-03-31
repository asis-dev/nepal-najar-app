import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | Nepal Republic',
  description:
    'Manage your notification preferences — push alerts, email digests, and province-specific updates on government commitments. सूचना सेटिङ।',
  openGraph: {
    title: 'Notifications | Nepal Republic',
    description:
      'Stay updated on government commitment changes with push notifications and email digests.',
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
