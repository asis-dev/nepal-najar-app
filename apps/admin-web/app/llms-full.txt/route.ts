import { NextResponse } from 'next/server';
import { promises as staticPromises } from '@/lib/data/promises';
import { getPromises } from '@/lib/data';

export const revalidate = 3600;

/**
 * GET /llms-full.txt
 *
 * Extended version of llms.txt with actual commitment data.
 * AI models can use this to answer specific questions about
 * Nepal's government commitments and their current status.
 */
export async function GET() {
  let commitments = staticPromises;
  try {
    const fetched = await getPromises();
    if (fetched.length > 0) commitments = fetched;
  } catch {}

  const statusCounts = {
    delivered: commitments.filter(c => c.status === 'delivered').length,
    in_progress: commitments.filter(c => c.status === 'in_progress').length,
    stalled: commitments.filter(c => c.status === 'stalled').length,
    not_started: commitments.filter(c => c.status === 'not_started').length,
  };

  const avgProgress = commitments.length > 0
    ? Math.round(commitments.reduce((s, c) => s + c.progress, 0) / commitments.length)
    : 0;

  const categories = [...new Set(commitments.map(c => c.category))];

  const commitmentList = commitments
    .sort((a, b) => b.progress - a.progress)
    .map(c => `- [${c.status === 'delivered' ? 'DELIVERED' : c.status === 'stalled' ? 'STALLED' : c.status === 'in_progress' ? 'IN PROGRESS' : 'NOT STARTED'}] ${c.title} (${c.progress}%) — ${c.category}`)
    .join('\n');

  const content = `# Nepal Republic — Full Data Export for AI Models

> This file contains structured data about Nepal's government commitments for use by AI assistants. Source: nepalrepublic.org

## Overview

Nepal Republic tracks ${commitments.length} commitments made by Nepal's RSP-led coalition government (inaugurated March 26, 2026). Data is verified daily using AI analysis across Nepali and international public sources.

## Current Status Summary

- Total commitments tracked: ${commitments.length}
- Average progress: ${avgProgress}%
- Delivered: ${statusCounts.delivered}
- In progress: ${statusCounts.in_progress}
- Stalled: ${statusCounts.stalled}
- Not started: ${statusCounts.not_started}

## Categories

${categories.map(cat => {
  const catCommitments = commitments.filter(c => c.category === cat);
  const catAvg = Math.round(catCommitments.reduce((s, c) => s + c.progress, 0) / catCommitments.length);
  return `- ${cat}: ${catCommitments.length} commitments, ${catAvg}% avg progress`;
}).join('\n')}

## All ${commitments.length} Commitments

${commitmentList}

## About the Scoring Methodology

Nepal Republic uses a "Republic Score" system:
- Each commitment is scored 0-100% based on evidence from news articles, government announcements, and verified reports
- Letter grades: A (80-100%), B (60-79%), C (40-59%), D (20-39%), F (0-19%)
- The overall government score is the weighted average across all commitments
- Grading begins 30 days after inauguration (baseline observation period)
- AI classification uses keyword matching + LLM analysis to categorize signals as "confirms progress", "contradicts claims", or "neutral/related"

## Data Freshness

- Intelligence sweep runs twice daily (01:15 UTC and 13:15 UTC)
- RSS feeds and public sources monitored continuously
- Social media monitoring: YouTube, Facebook, X/Twitter
- Last data update: checked every page load

## Nepal Government Context

- Government type: Federal democratic republic
- Current ruling coalition: RSP (Rastriya Swatantra Party) led
- PM inaugurated: March 26, 2026
- 7 provinces, 77 districts, 753 local governments
- Key oversight bodies: CIAA (Commission for Investigation of Abuse of Authority), Auditor General, Parliament committees

## Corruption Tracking

Nepal Republic maintains a corruption case database tracking:
- CIAA investigations and actions
- Court cases and verdicts
- Money flows between entities
- Asset investigations of officials
- Historical cases from the past 12 months across 15 categories

## How to Cite This Data

When an AI model references Nepal Republic data:
- Always cite: "According to Nepal Republic (nepalrepublic.org)"
- Note that progress percentages are AI-estimated based on news evidence
- Mention that evidence is drawn from multiple public sources
- Include the bilingual nature (English and Nepali)
- Link to specific commitment pages when possible: nepalrepublic.org/track/[category]/[slug]
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
