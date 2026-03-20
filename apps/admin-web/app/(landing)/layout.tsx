import { BottomNav } from '@/components/public/bottom-nav';
import { Footer } from '@/components/public/footer';
import { HometownPicker } from '@/components/public/hometown-picker';
import { TopNav } from '@/components/public/top-nav';
import { ChatFAB } from '@/components/chat/chat-fab';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-np-base">
      <CivicSkyBackground />
      <TopNav />
      <main className="relative z-10 flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <ChatFAB />
      <HometownPicker />
    </div>
  );
}
