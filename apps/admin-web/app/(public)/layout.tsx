'use client';

import { TopNav } from '@/components/public/top-nav';
import { Footer } from '@/components/public/footer';
import { BottomNav } from '@/components/public/bottom-nav';
import { HometownPicker } from '@/components/public/hometown-picker';
import { PilotAnalytics } from '@/components/public/pilot-analytics';
import { CivicSkyBackground } from '@/components/ui/civic-sky-background';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nepal Republic',
    alternateName: 'नेपाल रिपब्लिक',
    url: 'https://www.nepalrepublic.org',
    description:
      'AI-powered civic intelligence on people\'s issues and government promises, backed by evidence and accountability assessment.',
    sameAs: [],
  };

  return (
    <div className="flex min-h-screen flex-col bg-np-base">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
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
