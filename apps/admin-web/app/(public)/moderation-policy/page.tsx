import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Moderation Policy',
  description:
    'How Nepal Republic moderates comments, evidence, and complaint submissions with AI triage and human review.',
  path: '/moderation-policy',
});

export default function ModerationPolicyPage() {
  return (
    <section className="public-section pt-8">
      <div className="public-shell max-w-3xl">
        <h1 className="text-2xl font-semibold text-white">Moderation Policy</h1>
        <p className="mt-3 text-sm text-gray-400">
          Updated: April 2, 2026
        </p>

        <div className="mt-6 space-y-5 text-sm text-gray-300 leading-7">
          <p>
            Nepal Republic uses a trust-boundary model: AI can suggest and route,
            but sensitive public-state changes require review rules or explicit
            approval pathways.
          </p>
          <p>
            Community submissions (complaints, comments, evidence) are screened for
            spam, abuse, and safety risks. Potentially harmful submissions can be
            hidden, queued, or rejected.
          </p>
          <p>
            Evidence classification and commitment status recommendations are logged
            with review metadata for transparency and auditability.
          </p>
          <p>
            Users can dispute moderation outcomes through the feedback channel. We
            review disputes and update records where justified.
          </p>
        </div>
      </div>
    </section>
  );
}
