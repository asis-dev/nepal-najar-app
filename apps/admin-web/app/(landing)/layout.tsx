import type { Metadata } from 'next';
import { BottomNav } from '@/components/public/bottom-nav';
import { Footer } from '@/components/public/footer';
import { HometownPicker } from '@/components/public/hometown-picker';
import { PilotAnalytics } from '@/components/public/pilot-analytics';
import { TopNav } from '@/components/public/top-nav';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';
import { createMetadata } from '@/lib/seo';
import { getCorruptionStats } from '@/lib/data/corruption-data';
import { formatAmountNpr } from '@/lib/data/corruption-types';

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getCorruptionStats();
  const amount = formatAmountNpr(stats.totalAmountNpr);

  const ogStats = `109 Commitments Tracked|${stats.totalCases} Corruption Cases|रू ${amount} Exposed|80+ Live Sources`;

  return createMetadata({
    title: 'AI-powered citizen platform for Nepal.',
    description: `From everyday services to national accountability, AI-powered navigation for Nepal. 109 commitments monitored. रू ${amount} in corruption exposed. ${stats.totalCases} cases. Daily briefings powered by 80+ sources.`,
    path: '/',
    ogImage: `/api/og?title=${encodeURIComponent('AI-powered citizen platform for Nepal.')}&subtitle=${encodeURIComponent('From everyday services to national accountability, AI-powered navigation for Nepal.')}&section=dashboard&stats=${encodeURIComponent(ogStats)}`,
  });
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-np-base">
      <PilotAnalytics />
      <CivicSkyBackground />
      <TopNav />
      <main className="relative z-10 flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <HometownPicker />
    </div>
  );
}
