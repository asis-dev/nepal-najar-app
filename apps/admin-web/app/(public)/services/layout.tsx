import type { Metadata } from 'next';
import ServiceChat from '@/components/public/services/service-chat';
import PostHogProvider from '@/components/public/services/posthog-provider';
import { OfflineBanner } from '@/components/public/services/offline-banner';
import { PWAInstallPrompt } from '@/components/public/services/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'Nepal Services Directory — Nepal Republic',
  description:
    'Every government and essential service in Nepal — documents, fees, steps, and offices. In Nepali and English. No more standing in line blind.',
  openGraph: {
    title: 'Nepal Services Directory',
    description: 'Every government and essential service in Nepal, in one place.',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <OfflineBanner />
      <PostHogProvider />
      {children}
      <ServiceChat locale="en" />
      <PWAInstallPrompt />
    </div>
  );
}
