import type { Metadata } from 'next';
import Link from 'next/link';
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
      {/* Advisor banner */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="mx-auto max-w-5xl px-4 py-2 text-center">
          <Link
            href="/advisor"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-[#DC143C]"
          >
            Not sure where to start? Ask our Service Advisor
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
      {children}
      <PWAInstallPrompt />
    </div>
  );
}
