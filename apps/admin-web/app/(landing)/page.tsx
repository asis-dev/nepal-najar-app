import { DashboardIsland } from '@/components/public/landing/dashboard-island';
import { FeedIsland } from '@/components/public/landing/feed-island';
import { SupportSection } from '@/components/public/landing/support-section';

/* ═══════════════════════════════════════════
   Landing Page — Server Component Shell
   Heavy client logic lives in island components
   ═══════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-np-void">
      {/* grid backdrop */}
      <div className="absolute inset-0 z-0 nepal-hero-grid opacity-50" />

      <div className="relative z-10">
        <DashboardIsland />

        <FeedIsland />
        <SupportSection />
      </div>
    </div>
  );
}
