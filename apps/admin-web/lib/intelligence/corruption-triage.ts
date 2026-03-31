import { aiComplete } from './ai-router';
import { normalizeNepaliRegister } from './nepali-text';
import type { CorruptionType, Severity } from '@/lib/data/corruption-types';

export interface CorruptionTriageInput {
  title?: string;
  description: string;
  language?: string;
  municipality?: string | null;
  evidence_url?: string | null;
}

export interface CorruptionTriageResult {
  title: string;
  titleNe: string | null;
  corruption_type: CorruptionType;
  severity: Severity;
  confidence: number;
  summary: string;
  suggested_entities: string[];
  suggested_tags: string[];
  reasoning: string;
}

const CORRUPTION_KEYWORDS: Array<{ type: CorruptionType; keywords: RegExp[] }> = [
  { type: 'bribery', keywords: [/\bbrib/i, /\bghus\b/i, /घुस/, /रिश्वत/, /चाहिने पैसा/] },
  { type: 'embezzlement', keywords: [/\bembezzl/i, /\bmisappropriat/i, /अपचलन/, /गबन/, /हिनामिना/] },
  { type: 'nepotism', keywords: [/\bnepotism\b/i, /\bfavoritism\b/i, /नातावाद/, /कृपावाद/, /आफ्नो मान्छे/] },
  { type: 'money_laundering', keywords: [/money\s*launder/i, /\bhawala\b/i, /मनी लाउन्डरिङ/, /हुण्डी/] },
  { type: 'land_grab', keywords: [/land\s*grab/i, /\bencroach/i, /जग्गा कब्जा/, /ऐलानी/, /गुठी/] },
  { type: 'procurement_fraud', keywords: [/\bprocurement\b/i, /\btender\b/i, /\bbid\s*rig/i, /खरिद/, /बोलपत्र/, /ठेक्का/] },
  { type: 'tax_evasion', keywords: [/tax\s*evas/i, /\btax\s*fraud\b/i, /कर छल/, /राजस्व चुहावट/] },
  { type: 'abuse_of_authority', keywords: [/abuse\s*of\s*authority/i, /\bmisuse\b/i, /अधिकार दुरुपयोग/, /पद दुरुपयोग/] },
  { type: 'kickback', keywords: [/\bkickback\b/i, /\bcommission\b/i, /कमिसन/, /दलाली/] },
];

function clampConfidence(value: unknown, fallback = 0.55): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function normalizeCorruptionType(value: unknown): CorruptionType {
  const valid: CorruptionType[] = [
    'bribery',
    'embezzlement',
    'nepotism',
    'money_laundering',
    'land_grab',
    'procurement_fraud',
    'tax_evasion',
    'abuse_of_authority',
    'kickback',
    'other',
  ];
  return valid.includes(value as CorruptionType)
    ? (value as CorruptionType)
    : 'other';
}

function normalizeSeverity(value: unknown): Severity {
  const valid: Severity[] = ['minor', 'major', 'mega'];
  return valid.includes(value as Severity)
    ? (value as Severity)
    : 'major';
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

function inferCorruptionType(text: string): CorruptionType {
  const source = text || '';
  for (const rule of CORRUPTION_KEYWORDS) {
    if (rule.keywords.some((pattern) => pattern.test(source))) {
      return rule.type;
    }
  }
  return 'other';
}

function fallbackTitle(description: string, corruptionType: CorruptionType): string {
  const firstSentence = description.split(/[.\n]/).map((line) => line.trim()).find(Boolean);
  if (firstSentence && firstSentence.length >= 8) {
    return firstSentence.slice(0, 120);
  }
  const typeLabels: Partial<Record<CorruptionType, string>> = {
    bribery: 'Bribery report',
    embezzlement: 'Embezzlement report',
    nepotism: 'Nepotism report',
    land_grab: 'Land grab report',
    procurement_fraud: 'Procurement fraud report',
    abuse_of_authority: 'Abuse of authority report',
  };
  return typeLabels[corruptionType] || 'Corruption report';
}

export async function triageCorruptionReport(input: CorruptionTriageInput): Promise<CorruptionTriageResult> {
  const description = (input.description || '').trim();
  const merged = `${input.title || ''}\n${description}`.trim();
  const fallbackType = inferCorruptionType(merged);

  const systemPrompt = `You triage corruption reports for Nepal Republic, a civic accountability platform tracking Nepal's government.

Return JSON only with:
{
  "title": "short corruption case title in English",
  "titleNe": "short corruption case title in Nepali Devanagari",
  "corruption_type": "bribery|embezzlement|nepotism|money_laundering|land_grab|procurement_fraud|tax_evasion|abuse_of_authority|kickback|other",
  "severity": "minor|major|mega",
  "confidence": 0.0,
  "summary": "one paragraph summary for public display",
  "suggested_entities": ["Person Name 1", "Organization Name"],
  "suggested_tags": ["tag1", "tag2"],
  "reasoning": "short reasoning for classification"
}

Rules:
- You understand Nepal's anti-corruption landscape: CIAA (अख्तियार दुरुपयोग अनुसन्धान आयोग), DRI (राजस्व अनुसन्धान विभाग), Nepal Police anti-corruption unit, land revenue offices, procurement processes under Public Procurement Act.
- Severity guidelines:
  - minor: small bribes (<1 lakh NPR), petty favoritism, minor procedural violations
  - major: significant amounts (1 lakh - 1 crore NPR), systematic abuse, multiple officials involved
  - mega: crore-level amounts, high-level officials/politicians, large-scale procurement fraud, cross-border money flows
- Extract all named persons, organizations, offices, and companies mentioned as suggested_entities.
- Keep confidence conservative — citizen reports are unverified allegations.
- Keep Nepali text in natural Nepal register (not Hindi broadcast wording).
- If the report mentions specific amounts, offices, or named individuals, confidence can be higher.
- Tags should include relevant institutions (e.g. "ciaa", "municipality", "land-revenue"), sectors, and locations.`;

  const userPrompt = `Corruption report:
Title: ${input.title || '(not provided)'}
Description: ${description}
Language hint: ${input.language || 'ne'}
Municipality: ${input.municipality || '(unknown)'}
Evidence URL: ${input.evidence_url || '(none)'}`;

  try {
    const ai = await aiComplete('extract', systemPrompt, userPrompt);
    const parsed = parseJson<Record<string, unknown>>(ai.content);
    if (parsed) {
      const corruptionType = normalizeCorruptionType(parsed.corruption_type);

      const suggestedEntities = Array.isArray(parsed.suggested_entities)
        ? parsed.suggested_entities.filter((item): item is string => typeof item === 'string').slice(0, 15)
        : [];

      const suggestedTags = Array.isArray(parsed.suggested_tags)
        ? parsed.suggested_tags.filter((item): item is string => typeof item === 'string').slice(0, 10)
        : [];

      const title =
        typeof parsed.title === 'string' && parsed.title.trim().length > 0
          ? parsed.title.trim()
          : fallbackTitle(description, corruptionType);
      const titleNe =
        typeof parsed.titleNe === 'string' && parsed.titleNe.trim().length > 0
          ? normalizeNepaliRegister(parsed.titleNe.trim())
          : null;
      const summary =
        typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : description.slice(0, 300);
      const reasoning =
        typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0
          ? parsed.reasoning.trim()
          : 'Fallback classification applied.';

      return {
        title,
        titleNe,
        corruption_type: corruptionType,
        severity: normalizeSeverity(parsed.severity),
        confidence: clampConfidence(parsed.confidence, 0.5),
        summary,
        suggested_entities: suggestedEntities,
        suggested_tags: suggestedTags,
        reasoning,
      };
    }
  } catch (error) {
    console.warn(
      '[CorruptionTriage] AI triage failed, using fallback:',
      error instanceof Error ? error.message : 'unknown',
    );
  }

  // Keyword-based fallback
  const isMega = /crore|करोड|arab|अरब|billion|minister|मन्त्री|secretary|सचिव/i.test(merged);
  const isMajor = /lakh|लाख|officer|अधिकृत|procurement|खरिद|tender|बोलपत्र/i.test(merged);

  return {
    title: fallbackTitle(description, fallbackType),
    titleNe: null,
    corruption_type: fallbackType,
    severity: isMega ? 'mega' : isMajor ? 'major' : 'minor',
    confidence: 0.35,
    summary: description.slice(0, 300),
    suggested_entities: [],
    suggested_tags: [],
    reasoning: 'Keyword-based fallback classification.',
  };
}
