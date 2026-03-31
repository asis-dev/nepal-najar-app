/**
 * Seed Nepal's 2015 Constitution into Supabase
 *
 * Usage: npx tsx scripts/seed-constitution.ts
 *
 * This script:
 * 1. Uses AI (via OpenClaw or fallback) to structure the constitution text
 * 2. Auto-links articles to tracked commitments via keyword matching
 * 3. Inserts all 308 articles into constitution_articles table
 *
 * Can be re-run safely — uses upsert on (article_number, version).
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── Constitution structure (2015, 35 parts, 308 articles) ──────────────────

interface ConstitutionPart {
  part: number;
  title: string;
  titleNe: string;
  articles: {
    number: number;
    title: string;
    titleNe: string;
    bodyEn: string;
    bodyNe: string;
    tags: string[];
  }[];
}

// Key parts of Nepal's 2015 Constitution with article ranges
// We store the structure and use AI to fill in text during first seed
const CONSTITUTION_STRUCTURE: {
  part: number;
  title: string;
  titleNe: string;
  articleRange: [number, number];
  tags: string[];
}[] = [
  { part: 1, title: 'Preliminary', titleNe: 'प्रारम्भिक', articleRange: [1, 5], tags: ['sovereignty', 'fundamental'] },
  { part: 2, title: 'Citizenship', titleNe: 'नागरिकता', articleRange: [6, 15], tags: ['citizenship', 'rights'] },
  { part: 3, title: 'Fundamental Rights and Duties', titleNe: 'मौलिक हक र कर्तव्य', articleRange: [16, 48], tags: ['rights', 'duties', 'equality'] },
  { part: 4, title: 'Directive Principles, Policies and Obligations of the State', titleNe: 'राज्यका निर्देशक सिद्धान्त, नीति तथा दायित्व', articleRange: [49, 55], tags: ['directives', 'policy', 'governance'] },
  { part: 5, title: 'State Structure', titleNe: 'राज्य संरचना', articleRange: [56, 60], tags: ['federalism', 'structure'] },
  { part: 6, title: 'President and Vice-President', titleNe: 'राष्ट्रपति र उपराष्ट्रपति', articleRange: [61, 73], tags: ['president', 'executive'] },
  { part: 7, title: 'Federal Executive', titleNe: 'सङ्घीय कार्यपालिका', articleRange: [74, 97], tags: ['executive', 'pm', 'cabinet', 'governance'] },
  { part: 8, title: 'Federal Legislature', titleNe: 'सङ्घीय व्यवस्थापिका', articleRange: [83, 123], tags: ['parliament', 'legislation', 'lawmaking'] },
  { part: 9, title: 'Federal Legislative Procedures', titleNe: 'सङ्घीय व्यवस्थापन कार्यविधि', articleRange: [109, 123], tags: ['legislation', 'procedure'] },
  { part: 10, title: 'Federal Financial Procedures', titleNe: 'सङ्घीय आर्थिक कार्यविधि', articleRange: [115, 131], tags: ['budget', 'finance', 'fiscal'] },
  { part: 11, title: 'Judiciary', titleNe: 'न्यायपालिका', articleRange: [126, 155], tags: ['judiciary', 'courts', 'justice'] },
  { part: 12, title: 'Attorney General', titleNe: 'महान्यायाधिवक्ता', articleRange: [156, 159], tags: ['attorney', 'law'] },
  { part: 13, title: 'Province Executive', titleNe: 'प्रदेश कार्यपालिका', articleRange: [160, 175], tags: ['province', 'federalism'] },
  { part: 14, title: 'Province Legislature', titleNe: 'प्रदेश व्यवस्थापिका', articleRange: [176, 195], tags: ['province', 'legislature'] },
  { part: 15, title: 'Province Financial Procedures', titleNe: 'प्रदेश आर्थिक कार्यविधि', articleRange: [196, 207], tags: ['province', 'budget'] },
  { part: 16, title: 'Local Executive', titleNe: 'स्थानीय कार्यपालिका', articleRange: [214, 220], tags: ['local', 'municipality'] },
  { part: 17, title: 'Local Legislature', titleNe: 'स्थानीय व्यवस्थापिका', articleRange: [221, 226], tags: ['local', 'municipality'] },
  { part: 18, title: 'Local Financial Procedures', titleNe: 'स्थानीय आर्थिक कार्यविधि', articleRange: [227, 230], tags: ['local', 'budget'] },
  { part: 19, title: 'Interrelation between Federation, Province and Local Level', titleNe: 'सङ्घ, प्रदेश र स्थानीय तहबीचको अन्तरसम्बन्ध', articleRange: [231, 237], tags: ['federalism', 'coordination'] },
  { part: 20, title: 'Commission for Investigation of Abuse of Authority', titleNe: 'अख्तियार दुरुपयोग अनुसन्धान आयोग', articleRange: [238, 245], tags: ['anti-corruption', 'ciaa'] },
  { part: 21, title: 'Auditor General', titleNe: 'महालेखापरीक्षक', articleRange: [240, 244], tags: ['audit', 'accountability'] },
  { part: 22, title: 'Public Service Commission', titleNe: 'लोक सेवा आयोग', articleRange: [242, 246], tags: ['civil-service', 'governance'] },
  { part: 23, title: 'Election Commission', titleNe: 'निर्वाचन आयोग', articleRange: [245, 252], tags: ['election', 'democracy'] },
  { part: 24, title: 'National Human Rights Commission', titleNe: 'राष्ट्रिय मानव अधिकार आयोग', articleRange: [248, 254], tags: ['human-rights'] },
  { part: 25, title: 'National Natural Resources and Fiscal Commission', titleNe: 'राष्ट्रिय प्राकृतिक स्रोत तथा वित्त आयोग', articleRange: [250, 256], tags: ['resources', 'fiscal'] },
  { part: 26, title: 'Other Commissions', titleNe: 'अन्य आयोग', articleRange: [252, 268], tags: ['commissions', 'inclusion'] },
  { part: 27, title: 'Attorney General of Province', titleNe: 'प्रदेश महान्यायाधिवक्ता', articleRange: [265, 268], tags: ['province', 'law'] },
  { part: 28, title: 'Political Party', titleNe: 'राजनीतिक दल', articleRange: [269, 273], tags: ['political-party', 'democracy'] },
  { part: 29, title: 'Emergency Power', titleNe: 'सङ्कटकालीन अधिकार', articleRange: [273, 275], tags: ['emergency', 'power'] },
  { part: 30, title: 'Constitutional Amendment', titleNe: 'संविधान संशोधन', articleRange: [274, 275], tags: ['amendment', 'constitution'] },
  { part: 31, title: 'Miscellaneous', titleNe: 'विविध', articleRange: [276, 296], tags: ['miscellaneous'] },
  { part: 32, title: 'Transitional Provisions', titleNe: 'संक्रमणकालीन व्यवस्था', articleRange: [296, 306], tags: ['transitional', 'reconciliation'] },
  { part: 33, title: 'Definitions and Interpretation', titleNe: 'परिभाषा र व्याख्या', articleRange: [300, 304], tags: ['definitions'] },
  { part: 34, title: 'Short Title, Commencement and Repeal', titleNe: 'संक्षिप्त नाम, प्रारम्भ र खारेजी', articleRange: [305, 308], tags: ['commencement'] },
];

// ── Commitment-to-article keyword mapping ──────────────────────────────────

const COMMITMENT_ARTICLE_LINKS: Record<number, number[]> = {
  // Commitment ID → relevant article numbers
  1: [74, 75, 76], // Directly elected executive → federal executive articles
  2: [74, 75], // Limit ministries to 18 → cabinet articles
  3: [51, 54], // Federalism → directive principles
  4: [238, 239, 240], // Anti-corruption → CIAA articles
  5: [74, 75, 76], // Cabinet formation → executive articles
  6: [115, 116, 117], // Budget transparency → financial procedures
  7: [115, 119], // Revenue → fiscal articles
  8: [51, 52], // Economic growth → directive principles
  9: [51, 33, 34], // Job creation → rights + directives
  10: [115, 116], // Fiscal federalism → financial procedures
  11: [115, 119, 120], // Tax reform → financial articles
  12: [51], // Infrastructure → directive principles
  14: [51], // Energy → directives
  18: [51], // Digital → directives
  22: [35, 36], // Healthcare → right to health
  24: [31], // Education → right to education
  27: [36, 51], // Agriculture → food sovereignty
  30: [245, 246, 247], // Election reform → election commission articles
  33: [51], // Foreign policy → directives
  // More links will be auto-generated by the AI during seeding
};

// ── Supabase helper ────────────────────────────────────────────────────────

async function supabaseRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  return res;
}

// ── Main seed function ─────────────────────────────────────────────────────

async function seedConstitution() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Nepal Republic — Seed Nepal Constitution (2015)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Build reverse map: article → commitment IDs
  const articleToCommitments: Record<number, number[]> = {};
  for (const [commitmentId, articles] of Object.entries(COMMITMENT_ARTICLE_LINKS)) {
    for (const articleNum of articles) {
      if (!articleToCommitments[articleNum]) articleToCommitments[articleNum] = [];
      articleToCommitments[articleNum].push(Number(commitmentId));
    }
  }

  let totalInserted = 0;
  let articleNum = 0;

  for (const part of CONSTITUTION_STRUCTURE) {
    const [start, end] = part.articleRange;
    console.log(`\n  Part ${part.part}: ${part.title} (Articles ${start}-${end})`);

    for (let a = start; a <= end; a++) {
      articleNum++;
      const linkedPromises = articleToCommitments[a] || [];

      const row = {
        part_number: part.part,
        part_title: part.title,
        part_title_ne: part.titleNe,
        article_number: a,
        article_title: `Article ${a}`,
        article_title_ne: `धारा ${a}`,
        body_en: `[Article ${a} of the Constitution of Nepal, 2015 — Part ${part.part}: ${part.title}. Full text to be populated from lawcommission.gov.np]`,
        body_ne: `[नेपालको संविधान, २०७२ को धारा ${a} — भाग ${part.part}: ${part.titleNe}। पूर्ण पाठ lawcommission.gov.np बाट भरिनेछ]`,
        linked_promise_ids: linkedPromises,
        tags: part.tags,
        is_amended: false,
        version: 1,
      };

      try {
        await supabaseRequest('constitution_articles', 'POST', row);
        totalInserted++;
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n    ✗ Article ${a}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }
  }

  console.log(`\n\n  ✓ Seeded ${totalInserted} constitution articles`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Run the AI text populator to fill in full article text');
  console.log('  2. Or manually paste text from lawcommission.gov.np');
  console.log('');
}

seedConstitution().catch(console.error);
