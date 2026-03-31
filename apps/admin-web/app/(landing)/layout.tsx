import { BottomNav } from '@/components/public/bottom-nav';
import { Footer } from '@/components/public/footer';
import { HometownPicker } from '@/components/public/hometown-picker';
import { PilotAnalytics } from '@/components/public/pilot-analytics';
import { TopNav } from '@/components/public/top-nav';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Track Government Promises',
  description:
    "Is Nepal's government keeping its promises? Track 109 commitments with real-time evidence, daily briefings, and citizen reports. Free and independent.",
  path: '/',
});

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
