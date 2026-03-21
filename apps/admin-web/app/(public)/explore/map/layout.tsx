import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Promise Map',
  description: 'Interactive map showing government promise progress across Nepal\'s 7 provinces and 77 districts.',
  path: '/explore/map',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
