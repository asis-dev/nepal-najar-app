import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Mukta } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { StructuredData } from '@/components/seo/structured-data';
import { createMetadata } from '@/lib/seo';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
});

const mukta = Mukta({
  subsets: ['devanagari', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mukta',
});

export const viewport: Viewport = {
  themeColor: '#07111F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  ...createMetadata(),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <StructuredData />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${mukta.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
