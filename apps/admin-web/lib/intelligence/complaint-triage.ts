import { aiComplete } from './ai-router';
import { normalizeNepaliRegister } from './nepali-text';
import type { ComplaintIssueType, ComplaintSeverity } from '@/lib/complaints/types';
import { routeToAuthority, type AuthorityRoute } from '@/lib/complaints/authority-router';

export interface ComplaintTriageInput {
  title?: string;
  description: string;
  language?: string;
  province?: string | null;
  district?: string | null;
  municipality?: string | null;
  wardNumber?: string | null;
}

export interface ComplaintTriageResult {
  title: string;
  titleNe: string | null;
  descriptionNe: string | null;
  issueType: ComplaintIssueType;
  severity: ComplaintSeverity;
  departmentKey: string;
  confidence: number;
  summary: string;
  suggestedTags: string[];
  reasoning: string;
  /** Deterministic authority routing (rules engine, not AI) */
  authorityRoute: AuthorityRoute;
}

const ISSUE_TO_DEPARTMENT: Record<ComplaintIssueType, string> = {
  roads: 'infrastructure',
  water: 'water',
  electricity: 'electricity',
  health: 'health',
  education: 'education',
  sanitation: 'sanitation',
  internet: 'internet',
  safety: 'safety',
  employment: 'employment',
  environment: 'environment',
  other: 'local-municipality',
};

const ISSUE_KEYWORDS: Array<{ issueType: ComplaintIssueType; keywords: RegExp[] }> = [
  { issueType: 'roads', keywords: [/\broad\b/i, /\bpothole\b/i, /सडक/, /खाल्डो/, /बाटो/] },
  { issueType: 'water', keywords: [/\bwater\b/i, /drinking water/i, /पानी/, /धारा/, /खानेपानी/] },
  { issueType: 'electricity', keywords: [/\belectricity\b/i, /\bpower\b/i, /बिजुली/, /ट्रान्सफर्मर/] },
  { issueType: 'health', keywords: [/\bhospital\b/i, /\bclinic\b/i, /स्वास्थ्य/, /अस्पताल/] },
  { issueType: 'education', keywords: [/\bschool\b/i, /\bteacher\b/i, /विद्यालय/, /शिक्षा/] },
  { issueType: 'sanitation', keywords: [/\bgarbage\b/i, /\bwaste\b/i, /फोहर/, /सरसफाइ/, /ढल/] },
  { issueType: 'internet', keywords: [/\binternet\b/i, /\bnetwork\b/i, /इन्टरनेट/, /नेट/] },
  { issueType: 'safety', keywords: [/\bpolice\b/i, /\bsafety\b/i, /\bcrime\b/i, /सुरक्षा/, /प्रहरी/] },
  { issueType: 'employment', keywords: [/\bjob\b/i, /\bemployment\b/i, /रोजगार/, /काम/] },
  { issueType: 'environment', keywords: [/\bpollution\b/i, /\bsmoke\b/i, /प्रदूषण/, /वातावरण/, /धुवाँ/] },
];

function clampConfidence(value: unknown, fallback = 0.55): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function normalizeIssueType(value: unknown): ComplaintIssueType {
  const valid: ComplaintIssueType[] = [
    'roads',
    'water',
    'electricity',
    'health',
    'education',
    'sanitation',
    'internet',
    'safety',
    'employment',
    'environment',
    'other',
  ];
  return valid.includes(value as ComplaintIssueType)
    ? (value as ComplaintIssueType)
    : 'other';
}

function normalizeSeverity(value: unknown): ComplaintSeverity {
  const valid: ComplaintSeverity[] = ['low', 'medium', 'high', 'critical'];
  return valid.includes(value as ComplaintSeverity)
    ? (value as ComplaintSeverity)
    : 'medium';
}

function parseJson<T>(content: string): T | null {
  try {
    const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function inferIssueType(text: string): ComplaintIssueType {
  const source = text || '';
  for (const rule of ISSUE_KEYWORDS) {
    if (rule.keywords.some((pattern) => pattern.test(source))) {
      return rule.issueType;
    }
  }
  return 'other';
}

function fallbackTitle(description: string, issueType: ComplaintIssueType): string {
  const firstSentence = description.split(/[.\n]/).map((line) => line.trim()).find(Boolean);
  if (firstSentence && firstSentence.length >= 8) {
    return firstSentence.slice(0, 120);
  }
  if (issueType === 'roads') return 'Road condition complaint';
  if (issueType === 'water') return 'Water supply complaint';
  if (issueType === 'electricity') return 'Electricity service complaint';
  return 'Public service complaint';
}

export async function triageComplaintInput(input: ComplaintTriageInput): Promise<ComplaintTriageResult> {
  const description = (input.description || '').trim();
  const merged = `${input.title || ''}\n${description}`.trim();
  const fallbackIssue = inferIssueType(merged);

  const systemPrompt = `You triage Nepal civic complaints for a public accountability platform.

Return JSON only with:
{
  "title": "short complaint title in English",
  "titleNe": "short complaint title in Nepali Devanagari",
  "descriptionNe": "clean Nepali summary (2-4 lines)",
  "issueType": "roads|water|electricity|health|education|sanitation|internet|safety|employment|environment|other",
  "severity": "low|medium|high|critical",
  "departmentKey": "infrastructure|transport|urban|water|sanitation|electricity|health|education|internet|safety|employment|environment|local-municipality|home-affairs|other",
  "confidence": 0.0,
  "summary": "one paragraph for timeline",
  "suggestedTags": ["tag1", "tag2"],
  "reasoning": "short reasoning"
}

Rules:
- Prioritize concrete service-delivery routing for Nepal municipalities.
- If uncertain, route to local-municipality.
- Keep confidence conservative.
- If complaint mentions danger/injury/urgent hazard, severity should be high or critical.
- Keep Nepali text natural Nepal register (not Hindi broadcast wording).`;

  const userPrompt = `Complaint input:
Title: ${input.title || '(not provided)'}
Description: ${description}
Language hint: ${input.language || 'ne'}
Province: ${input.province || '(unknown)'}
District: ${input.district || '(unknown)'}
Municipality: ${input.municipality || '(unknown)'}
Ward: ${input.wardNumber || '(unknown)'}`;

  try {
    const ai = await aiComplete('extract', systemPrompt, userPrompt);
    const parsed = parseJson<Record<string, unknown>>(ai.content);
    if (parsed) {
      const issueType = normalizeIssueType(parsed.issueType);
      const departmentKey =
        typeof parsed.departmentKey === 'string' && parsed.departmentKey.trim().length > 0
          ? parsed.departmentKey.trim()
          : ISSUE_TO_DEPARTMENT[issueType];

      const suggestedTags = Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.filter((item): item is string => typeof item === 'string').slice(0, 8)
        : [];

      const title =
        typeof parsed.title === 'string' && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : fallbackTitle(description, issueType);
      const titleNe =
        typeof parsed.titleNe === 'string' && parsed.titleNe.trim().length > 0
          ? normalizeNepaliRegister(parsed.titleNe.trim())
          : null;
      const descriptionNe =
        typeof parsed.descriptionNe === 'string' && parsed.descriptionNe.trim().length > 0
          ? normalizeNepaliRegister(parsed.descriptionNe.trim())
          : null;
      const summary =
        typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : description.slice(0, 240);
      const reasoning =
        typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0
          ? parsed.reasoning.trim()
          : 'Fallback routing applied.';

      const severity = normalizeSeverity(parsed.severity);

      // Deterministic authority routing — rules engine, not AI
      const authorityRoute = routeToAuthority({
        issueType,
        severity,
        province: input.province,
        district: input.district,
        municipality: input.municipality,
        wardNumber: input.wardNumber,
        description: merged,
      });

      return {
        title,
        titleNe,
        descriptionNe,
        issueType,
        severity,
        departmentKey: authorityRoute.departmentKey,
        confidence: clampConfidence(parsed.confidence, 0.62),
        summary,
        suggestedTags,
        reasoning,
        authorityRoute,
      };
    }
  } catch (error) {
    console.warn(
      '[ComplaintTriage] AI triage failed, using fallback:',
      error instanceof Error ? error.message : 'unknown',
    );
  }

  const fallbackSeverity: ComplaintSeverity = /danger|urgent|accident|risk|hazard|घाइते|जोखिम|तत्काल|खतरा/i.test(merged)
    ? 'high'
    : 'medium';

  const fallbackRoute = routeToAuthority({
    issueType: fallbackIssue,
    severity: fallbackSeverity,
    province: input.province,
    district: input.district,
    municipality: input.municipality,
    wardNumber: input.wardNumber,
    description: merged,
  });

  return {
    title: fallbackTitle(description, fallbackIssue),
    titleNe: null,
    descriptionNe: null,
    issueType: fallbackIssue,
    severity: fallbackSeverity,
    departmentKey: fallbackRoute.departmentKey,
    confidence: 0.45,
    summary: description.slice(0, 240),
    suggestedTags: [],
    reasoning: 'Keyword-based fallback routing.',
    authorityRoute: fallbackRoute,
  };
}
