import type { ComplaintCase, ComplaintAuthorityChainNode } from '@/lib/complaints/types';
import { complaintShareText } from '@/lib/utils/share';
import type { ShareImageParams } from '@/lib/utils/share';

type Locale = 'en' | 'ne';

type ComplaintShareInput = Pick<
  ComplaintCase,
  | 'id'
  | 'title'
  | 'title_ne'
  | 'issue_type'
  | 'status'
  | 'municipality'
  | 'ward_number'
  | 'assigned_department_key'
  | 'department_key'
  | 'ai_triage'
  | 'trust_level'
> & {
  authority_chain?: ComplaintAuthorityChainNode[] | Array<Record<string, unknown>> | null;
};

interface ComplaintShareData {
  shareUrl: string;
  shareTitle: string;
  shareText: string;
  ogParams: ShareImageParams;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function prettify(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/_/g, ' ');
}

function statusLabel(status: string, isNe: boolean): string {
  const key = status.toLowerCase();
  if (!isNe) return prettify(key);
  const labels: Record<string, string> = {
    submitted: 'पेस भएको',
    triaged: 'वर्गीकृत',
    routed: 'रुट गरिएको',
    acknowledged: 'स्वीकार गरिएको',
    in_progress: 'काम भइरहेको',
    resolved: 'समाधान भएको',
    closed: 'बन्द गरिएको',
    needs_info: 'थप जानकारी चाहिएको',
    rejected: 'अस्वीकृत',
    duplicate: 'डुप्लिकेट',
    reopened: 'फेरि खोलिएको',
  };
  return labels[key] || prettify(key);
}

function parseAuthorityRoute(
  aiTriage: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!aiTriage) return null;
  return asRecord(aiTriage.authorityRoute);
}

function buildFactList(opts: {
  isNe: boolean;
  status: string;
  issueType: string;
  trustLevel: string;
  aiAuthority: string | null;
  assignedTo: string | null;
  ministryName: string | null;
  ministerName: string | null;
}): string[] {
  const { isNe, status, issueType, trustLevel, aiAuthority, assignedTo, ministryName, ministerName } = opts;
  const facts = [
    isNe ? `स्थिति: ${status}` : `Status: ${status}`,
    isNe ? `विषय: ${prettify(issueType)}` : `Issue: ${prettify(issueType)}`,
    isNe ? `विश्वास: ${prettify(trustLevel)}` : `Trust: ${prettify(trustLevel)}`,
    aiAuthority ? (isNe ? `AI रुटिङ: ${aiAuthority}` : `AI routed: ${aiAuthority}`) : null,
    assignedTo ? (isNe ? `जिम्मा: ${assignedTo}` : `Assigned: ${assignedTo}`) : null,
    ministryName ? (isNe ? `मन्त्रालय: ${ministryName}` : `Ministry: ${ministryName}`) : null,
    ministerName ? (isNe ? `मन्त्री: ${ministerName}` : `Minister: ${ministerName}`) : null,
  ];

  return facts.filter((fact): fact is string => Boolean(fact)).slice(0, 4);
}

function parseAuthorityChain(
  complaint: ComplaintShareInput,
): { ministryName: string | null; ministerName: string | null } {
  const nodes = Array.isArray(complaint.authority_chain) ? complaint.authority_chain : [];
  if (nodes.length === 0) return { ministryName: null, ministerName: null };

  const ministryNode = nodes.find((node) => asString(node.node_type) === 'ministry') || null;
  const ministerNode = nodes.find((node) => asString(node.node_type) === 'minister') || null;

  return {
    ministryName: asString(ministryNode?.authority_name) || asString(ministryNode?.authority_name_ne),
    ministerName: asString(ministerNode?.authority_name) || asString(ministerNode?.authority_name_ne),
  };
}

export function buildComplaintShareData(
  complaint: ComplaintShareInput,
  locale: Locale = 'en',
): ComplaintShareData {
  const isNe = locale === 'ne';
  const title = isNe && complaint.title_ne ? complaint.title_ne : complaint.title;
  const status = statusLabel(complaint.status, isNe);
  const issueType = complaint.issue_type;
  const assignedTo = prettify(complaint.assigned_department_key || complaint.department_key || '');

  const aiTriage = asRecord(complaint.ai_triage);
  const authorityRoute = parseAuthorityRoute(aiTriage);
  const aiAuthority = isNe
    ? asString(authorityRoute?.authorityNe) || asString(authorityRoute?.authority)
    : asString(authorityRoute?.authority) || asString(authorityRoute?.authorityNe);
  const { ministryName, ministerName } = parseAuthorityChain(complaint);

  const location = [
    complaint.municipality,
    complaint.ward_number ? (isNe ? `वडा ${complaint.ward_number}` : `Ward ${complaint.ward_number}`) : null,
  ]
    .filter(Boolean)
    .join(', ');

  const subtitle = [prettify(issueType), location].filter(Boolean).join(' · ');
  const facts = buildFactList({
    isNe,
    status,
    issueType,
    trustLevel: complaint.trust_level,
    aiAuthority,
    assignedTo: assignedTo || null,
    ministryName,
    ministerName,
  });

  return {
    shareUrl: `/complaints/${complaint.id}`,
    shareTitle: title,
    shareText: complaintShareText({
      locale,
      title,
      status,
      issueType,
      municipality: complaint.municipality,
      aiAuthority,
      assignedDepartment: assignedTo || null,
      ministryName,
      ministerName,
    }),
    ogParams: {
      ogTitle: title,
      ogSubtitle: subtitle || undefined,
      ogSection: 'complaints',
      ogStatus: complaint.status,
      ogFacts: facts.length > 0 ? facts.join('|') : undefined,
      ogLocale: locale,
    },
  };
}
