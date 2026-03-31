'use client';

import {
  Building2,
  Newspaper,
  Users,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

/**
 * Evidence source quality labels — honest, visible categorization.
 *
 * Categories:
 * - official_source   → Government gazette, parliament record, ministry press release
 * - reputable_news    → Established media outlet (Kathmandu Post, Republica, etc.)
 * - community         → Citizen-submitted photo, video, or testimony
 * - verifier_reviewed → Reviewed and approved by a verified community reviewer
 * - disputed          → Contradicted by other evidence or flagged
 * - weak              → Single unverified source, low confidence
 */

export type EvidenceSourceType =
  | 'official_source'
  | 'reputable_news'
  | 'community'
  | 'verifier_reviewed'
  | 'disputed'
  | 'weak';

const SOURCE_CONFIG: Record<
  EvidenceSourceType,
  {
    icon: typeof Building2;
    label: string;
    label_ne: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  official_source: {
    icon: Building2,
    label: 'Official source',
    label_ne: 'आधिकारिक स्रोत',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  reputable_news: {
    icon: Newspaper,
    label: 'Reputable news',
    label_ne: 'विश्वसनीय समाचार',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  community: {
    icon: Users,
    label: 'Community submitted',
    label_ne: 'समुदायले पेश गरेको',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  verifier_reviewed: {
    icon: ShieldCheck,
    label: 'Verifier reviewed',
    label_ne: 'प्रमाणकर्ताले समीक्षा गरेको',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  disputed: {
    icon: AlertTriangle,
    label: 'Disputed',
    label_ne: 'विवादित',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  weak: {
    icon: HelpCircle,
    label: 'Weak evidence',
    label_ne: 'कमजोर प्रमाण',
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
};

/** Derive source type from evidence metadata */
export function deriveSourceType(evidence: {
  source_type?: string;
  source_name?: string;
  verification_status?: string;
  confidence?: number;
  submitter_is_verifier?: boolean;
  status?: string;
}): EvidenceSourceType {
  // Disputed takes priority
  if (evidence.verification_status === 'disputed' || evidence.verification_status === 'false') {
    return 'disputed';
  }

  // Verifier reviewed
  if (evidence.submitter_is_verifier || evidence.verification_status === 'verified') {
    return 'verifier_reviewed';
  }

  // Official sources
  const officialTypes = ['parliament', 'press_conference', 'official_statement', 'government'];
  if (officialTypes.includes(evidence.source_type || '')) {
    return 'official_source';
  }

  // Reputable news
  const newsTypes = ['news_interview', 'youtube', 'facebook', 'twitter', 'tiktok'];
  const reputableSources = [
    'kathmandu post', 'republica', 'himalayan times', 'nepali times',
    'online khabar', 'setopati', 'ratopati', 'kantipur', 'nagarik',
    'news24', 'ntv', 'annapurna post',
  ];
  if (
    newsTypes.includes(evidence.source_type || '') ||
    reputableSources.some((s) => (evidence.source_name || '').toLowerCase().includes(s))
  ) {
    return 'reputable_news';
  }

  // Weak — single unverified, low confidence
  if ((evidence.confidence ?? 1) < 0.4 && evidence.verification_status === 'unverified') {
    return 'weak';
  }

  // Default: community submitted
  return 'community';
}

interface EvidenceSourceBadgeProps {
  sourceType: EvidenceSourceType;
  isNe?: boolean;
  compact?: boolean;
}

export function EvidenceSourceBadge({ sourceType, isNe = false, compact = false }: EvidenceSourceBadgeProps) {
  const config = SOURCE_CONFIG[sourceType];
  const Icon = config.icon;
  const label = isNe ? config.label_ne : config.label;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${config.bg} ${config.text} ${config.border}`}
        title={label}
      >
        <Icon className="w-2.5 h-2.5" />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
