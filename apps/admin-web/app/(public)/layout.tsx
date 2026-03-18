'use client';

import { TopNav } from '@/components/public/top-nav';
import { Footer } from '@/components/public/footer';
import { BottomNav } from '@/components/public/bottom-nav';
import { ChatFAB } from '@/components/chat/chat-fab';
import { HometownPicker } from '@/components/public/hometown-picker';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-np-base">
      <TopNav />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <ChatFAB />
      <HometownPicker />
    </div>
  );
}
