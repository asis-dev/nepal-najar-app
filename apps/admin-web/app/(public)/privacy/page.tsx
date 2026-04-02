import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Privacy Policy',
  description:
    'How Nepal Republic collects, uses, and protects user data for civic tracking, complaints, and evidence workflows.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <section className="public-section pt-8">
      <div className="public-shell max-w-3xl">
        <h1 className="text-2xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-400">
          Effective date: April 2, 2026
        </p>

        <div className="mt-6 space-y-5 text-sm text-gray-300 leading-7">
          <p>
            Nepal Republic collects only the data needed to operate civic tracking,
            complaints, and evidence workflows. This includes account details, submitted
            complaints, uploaded evidence, and app usage events.
          </p>
          <p>
            We use this data to run the platform, improve quality, prevent abuse, and
            maintain accountability records. We do not sell personal data.
          </p>
          <p>
            Some content may be reviewed by AI and human moderators for routing,
            safety, and quality control. Public-facing pages only show data intended
            for public visibility.
          </p>
          <p>
            You can request account deletion or data export by contacting the platform
            administrators through the in-app feedback channel.
          </p>
        </div>
      </div>
    </section>
  );
}
