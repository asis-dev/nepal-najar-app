import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Government Report Card',
  description:
    'Weekly government accountability report card — transparency score, what is working, what is not, and public voice on Nepal government commitments. सरकारी प्रगति रिपोर्ट कार्ड।',
  path: '/report-card',
  ogImage: '/api/report-card',
});

export default function ReportCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
