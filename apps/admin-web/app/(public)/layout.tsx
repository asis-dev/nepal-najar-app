'use client';

import { TopNav } from '@/components/public/top-nav';
import { Footer } from '@/components/public/footer';
import { BottomNav } from '@/components/public/bottom-nav';
import { HometownPicker } from '@/components/public/hometown-picker';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-np-base">
      <CivicSkyBackground />
      <TopNav />
      <main className="relative z-10 flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <HometownPicker />
    </div>
  );
}
