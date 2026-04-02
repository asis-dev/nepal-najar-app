import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nepal Republic — Embed Widget',
  robots: 'noindex, nofollow',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide the root layout's background, nav, and other UI for embeds */}
      <style dangerouslySetInnerHTML={{ __html: `
        .fixed.inset-0[aria-hidden="true"],
        .fixed.inset-0.pointer-events-none,
        nav.safe-bottom,
        nav, footer, header {
          display: none !important;
        }
        body, html {
          background: transparent !important;
          min-height: auto !important;
        }
      `}} />
      <div style={{ margin: 0, padding: 16, background: 'transparent' }}>
        {children}
      </div>
    </>
  );
}
