import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Terms of Use',
  description:
    'Terms for using Nepal Republic, including user responsibilities for submissions, complaints, and evidence.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <section className="public-section pt-8">
      <div className="public-shell max-w-3xl">
        <h1 className="text-2xl font-semibold text-white">Terms of Use</h1>
        <p className="mt-3 text-sm text-gray-400">
          Effective date: April 2, 2026
        </p>

        <div className="mt-6 space-y-5 text-sm text-gray-300 leading-7">
          <p>
            By using Nepal Republic, you agree to provide lawful, accurate, and
            non-abusive submissions. Do not upload harmful content, impersonate
            others, or submit fabricated evidence.
          </p>
          <p>
            We may moderate, limit, or remove content that violates safety,
            integrity, or legal requirements. Repeated abuse can lead to account
            restrictions.
          </p>
          <p>
            Public accountability scores and statuses are governed by review rules
            in the intelligence pipeline and may be updated as new verified evidence
            is processed.
          </p>
          <p>
            The service is provided on a best-effort basis. Operational outages,
            upstream source limitations, and model errors may affect data quality
            or timing.
          </p>
        </div>
      </div>
    </section>
  );
}
