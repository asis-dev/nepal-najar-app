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
    <section className="public-section pt-8 pb-12">
      <div className="public-shell max-w-3xl">
        <h1 className="text-2xl font-semibold text-white">Moderation Policy</h1>
        <p className="mt-3 text-sm text-gray-400">
          Updated: April 2, 2026
        </p>

        <div className="mt-8 space-y-8 text-sm text-gray-300 leading-7">
          {/* Overview */}
          <div>
            <p>
              Nepal Republic is a civic accountability platform. All user-generated
              content -- comments, proposals, evidence submissions, corruption
              reports, and complaints -- is subject to moderation to maintain a
              trustworthy public record.
            </p>
          </div>

          {/* AI-assisted moderation */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              AI-Assisted Moderation
            </h2>
            <p>
              Submissions are initially screened by AI for spam, abuse, and safety
              risks. AI can triage, classify, and route content, but cannot
              unilaterally change public-facing accountability data such as
              commitment statuses or scores. Sensitive changes require human review
              or explicit approval rules.
            </p>
          </div>

          {/* Comment rules */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Comment Guidelines
            </h2>
            <p className="mb-2">Comments should be constructive and relevant to the commitment, proposal, or topic being discussed. The following are not permitted:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li>Hate speech, threats, or personal attacks</li>
              <li>Spam, advertisements, or repeated off-topic posts</li>
              <li>Deliberately misleading claims presented as fact</li>
              <li>Doxxing or sharing private personal information</li>
              <li>Content that violates Nepali law</li>
            </ul>
          </div>

          {/* Community proposals */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Community Proposal Standards
            </h2>
            <p>
              Proposals should address specific, actionable civic issues. They must
              include a clear description and rationale. Proposals that are
              duplicates, incoherent, defamatory, or unrelated to governance may be
              removed or merged with existing entries.
            </p>
          </div>

          {/* Evidence & corruption reports */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Evidence &amp; Corruption Reports
            </h2>
            <p>
              Evidence submissions and corruption reports must include verifiable
              sources. Fabricated evidence, doctored documents, or unsubstantiated
              accusations targeting individuals without supporting information will
              be rejected. All evidence classifications are logged with review
              metadata for transparency.
            </p>
          </div>

          {/* What gets removed */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Content Removal
            </h2>
            <p className="mb-2">Content may be hidden, queued for review, or permanently removed if it:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li>Violates the guidelines above</li>
              <li>Contains illegal content or incites violence</li>
              <li>Is flagged by multiple community members</li>
              <li>Is identified as coordinated inauthentic activity</li>
            </ul>
            <p className="mt-2">
              Repeated violations may result in account restrictions.
            </p>
          </div>

          {/* Reporting / flagging */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Reporting &amp; Flagging
            </h2>
            <p>
              Any user can flag content they believe violates this policy using the
              flag button on comments, proposals, and evidence items. Flagged content
              is queued for review. You can also report issues through the in-app
              feedback channel.
            </p>
          </div>

          {/* Disputes */}
          <div>
            <h2 className="text-base font-medium text-white mb-2">
              Disputes
            </h2>
            <p>
              If you believe your content was incorrectly moderated, you can dispute
              the decision through the feedback channel. We review disputes and
              restore content where the removal was not justified.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
