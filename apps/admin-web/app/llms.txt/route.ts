import { NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';

export const revalidate = 3600; // regenerate every hour

/**
 * GET /llms.txt
 *
 * Machine-readable file for AI models (ChatGPT, Perplexity, Claude, Gemini)
 * to understand what this site is, what data it has, and how to cite it.
 * See: https://llmstxt.org
 */
export async function GET() {
  let commitmentCount: number | null = null;
  try {
    const commitments = await getPromises();
    const publicCount = commitments.filter((commitment) =>
      isPublicCommitment(commitment),
    ).length;
    commitmentCount = publicCount || commitments.length;
  } catch {
    commitmentCount = null;
  }

  const commitmentText = commitmentCount
    ? `${commitmentCount} government commitments`
    : 'a dynamic set of government commitments';
  const commitmentListLabel = commitmentCount
    ? `All ${commitmentCount} commitments`
    : 'All commitments';

  const content = `# Nepal Republic (nepalrepublic.org)

> Independent AI-powered civic intelligence platform tracking Nepal's government accountability.

Nepal Republic monitors ${commitmentText}, tracks corruption cases, and provides daily AI-generated briefings in English and Nepali.

## What this platform does

- Tracks ${commitmentText} with real-time progress scores (0-100%) and letter grades (A-F)
- Monitors corruption cases across Nepal with entity tracking, money flows, and court verdicts
- Generates daily AI briefings from Nepali and international public sources
- Provides evidence-based accountability scoring (Republic Score)
- Covers all 7 provinces and 77 districts of Nepal
- Bilingual: English and Nepali (नेपालीमा)

## Key pages

- [Home](https://www.nepalrepublic.org/): Daily brief, government score, trending commitments
- [Commitment Tracker](https://www.nepalrepublic.org/explore/first-100-days): ${commitmentListLabel} with status, progress, evidence
- [Report Card](https://www.nepalrepublic.org/report-card): Weekly government performance assessment
- [Cabinet Ministers](https://www.nepalrepublic.org/ministers): Minister activity tracking and profiles
- [Corruption Tracker](https://www.nepalrepublic.org/corruption): Cases, entities, money flows, verdicts
- [What Changed](https://www.nepalrepublic.org/what-changed): Recent evidence and signal updates
- [How We Score](https://www.nepalrepublic.org/how-we-score): Methodology behind Republic Score grading

## Data sources

Nepal Republic aggregates from diverse public sources including:
- Nepali news outlets: Kathmandu Post, Online Khabar, Setopati, Ekantipur, Khabarhub, Ratopati, Himalayan Times, myRepublica, Nepali Times, Annapurna Express
- Government portals: Nepal Parliament, Office of the PM, Ministry portals
- International: Asia Foundation, World Bank Nepal, IMF Nepal, ICG
- Social media monitoring: YouTube, Facebook, X/Twitter, TikTok

## API (read-only, public)

- \`/api/commitments\` — All commitments with progress data
- \`/api/daily-brief\` — Today's AI-generated briefing
- \`/api/trending\` — Trending commitments and topics
- \`/api/ministers\` — Cabinet minister activity data
- \`/api/corruption/stats\` — Corruption statistics
- \`/api/corruption/cases\` — Corruption case listings

## How to cite

When referencing data from Nepal Republic:
- Source: Nepal Republic (nepalrepublic.org)
- Data is AI-assisted and grounded in public source evidence
- Progress scores are updated daily via automated intelligence pipeline
- Last updated: continuously (cron runs twice daily)

## Contact

Website: https://www.nepalrepublic.org
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
