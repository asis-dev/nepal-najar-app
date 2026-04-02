import { NextRequest, NextResponse } from 'next/server';
import {
  promises,
  computeStats,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { computeGhantiScore } from '@/lib/data/ghanti-score';
import { getPromises } from '@/lib/data';
import { isPublicCommitment } from '@/lib/data/commitments';

// Cache for 5 minutes
export const revalidate = 300;

/** RSP government start date */
const GOV_START_DATE = new Date('2026-03-25T00:00:00+05:45');

type Platform = 'twitter' | 'facebook' | 'whatsapp';
type Lang = 'en' | 'ne';
type StatsSnapshot = ReturnType<typeof computeStats>;

function getDayNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - GOV_START_DATE.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function clipBriefSummary(input: string, lang: Lang): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.length <= 200) return trimmed;

  const parts = trimmed
    .split(lang === 'ne' ? /[।.!?]+\s*/ : /[.!?]+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return trimmed.slice(0, 197).trimEnd() + '...';
  }

  const joiner = lang === 'ne' ? '। ' : '. ';
  let output = parts.slice(0, 2).join(joiner).trim();
  if (!output) return '';
  if (lang === 'ne' && !output.endsWith('।')) output += '।';
  if (lang === 'en' && !/[.!?]$/.test(output)) output += '.';
  if (output.length > 220) output = output.slice(0, 217).trimEnd() + '...';
  return output;
}

function pickBriefSummary(payload: unknown, lang: Lang): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  const brief = (data.brief && typeof data.brief === 'object')
    ? (data.brief as Record<string, unknown>)
    : null;

  const raw =
    lang === 'ne'
      ? (data.summaryNe ||
         brief?.summaryNe ||
         data.summary ||
         brief?.summary)
      : (data.summaryEn ||
         brief?.summaryEn ||
         data.summary ||
         brief?.summary);

  if (typeof raw !== 'string') return undefined;
  const clipped = clipBriefSummary(raw, lang);
  return clipped || undefined;
}

function generateTwitterPost(
  day: number,
  stats: StatsSnapshot,
  lang: Lang,
  briefSummary?: string,
): string {
  const lines = lang === 'ne'
    ? [
        `\u{1F1F3}\u{1F1F5} दिन ${day}: सरकारको प्रगति`,
        '',
        `\u{1F4CA} ${stats.inProgress} अगाडि | ${stats.stalled} रोकिएको | ${stats.delivered} पूरा`,
        '',
        `औसत प्रगति: ${stats.avgProgress}%`,
        '',
        `सबै ${stats.total} प्रतिबद्धता \u2192 nepalrepublic.org`,
        '',
        '#NepalRepublic #नेपाल #जवाफदेहिता',
      ]
    : [
        `\u{1F1F3}\u{1F1F5} Day ${day}: Nepal Government Progress`,
        '',
        `\u{1F4CA} ${stats.inProgress} moving | ${stats.stalled} stalled | ${stats.delivered} delivered`,
        '',
        `Average progress: ${stats.avgProgress}%`,
        '',
        `Track all ${stats.total} commitments \u2192 nepalrepublic.org`,
        '',
        '#NepalRepublic #Nepal #AccountabilityMatters',
      ];
  let post = lines.join('\n');

  if (briefSummary) {
    const withSummary = lang === 'ne'
      ? [
          `\u{1F1F3}\u{1F1F5} दिन ${day}: सरकारको प्रगति`,
          '',
          `\u{1F4CA} ${stats.inProgress} अगाडि | ${stats.stalled} रोकिएको | ${stats.delivered} पूरा`,
          '',
          briefSummary,
          '',
          `सबै ${stats.total} प्रतिबद्धता \u2192 nepalrepublic.org`,
          '',
          '#NepalRepublic #नेपाल #जवाफदेहिता',
        ].join('\n')
      : [
          `\u{1F1F3}\u{1F1F5} Day ${day}: Nepal Government Progress`,
          '',
          `\u{1F4CA} ${stats.inProgress} moving | ${stats.stalled} stalled | ${stats.delivered} delivered`,
          '',
          briefSummary,
          '',
          `Track all ${stats.total} commitments \u2192 nepalrepublic.org`,
          '',
          '#NepalRepublic #Nepal #AccountabilityMatters',
        ].join('\n');

    if (withSummary.length <= 280) {
      post = withSummary;
    }
  }

  if (post.length > 280) {
    post = post.slice(0, 277) + '...';
  }

  return post;
}

function generateFacebookPost(
  day: number,
  stats: StatsSnapshot,
  score: number,
  lang: Lang,
  briefSummary?: string,
): string {
  const lines = lang === 'ne'
    ? [
        `\u{1F1F3}\u{1F1F5} नेपाल सरकार जवाफदेहिता अपडेट — दिन ${day}`,
        '',
        `\u{1F4CA} Republic Score: ${score}/100`,
        '',
        `आजको अवस्था:`,
        `\u2705 ${stats.delivered} प्रतिबद्धता पूरा`,
        `\u{1F504} ${stats.inProgress} प्रगतिमा`,
        `\u23F8 ${stats.stalled} रोकिएको`,
        `\u2B1C ${stats.notStarted} सुरु नभएको`,
        '',
        `कुल ${stats.total} प्रतिबद्धताको औसत प्रगति: ${stats.avgProgress}%`,
      ]
    : [
        `\u{1F1F3}\u{1F1F5} Nepal Government Accountability Update \u2014 Day ${day}`,
        '',
        `\u{1F4CA} Republic Score: ${score}/100`,
        '',
        `Here's where things stand:`,
        `\u2705 ${stats.delivered} commitments delivered`,
        `\u{1F504} ${stats.inProgress} in progress`,
        `\u23F8 ${stats.stalled} stalled \u2014 need attention`,
        `\u2B1C ${stats.notStarted} not started`,
        '',
        `Average progress across all ${stats.total} commitments: ${stats.avgProgress}%`,
      ];

  if (briefSummary) {
    lines.push('');
    lines.push(briefSummary);
  }

  lines.push('');
  lines.push(
    lang === 'ne'
      ? `पूरा रिपोर्ट र सबै प्रतिबद्धता ट्र्याक गर्न \u2192 nepalrepublic.org`
      : `See the full report card and track every commitment \u2192 nepalrepublic.org`,
  );
  lines.push('');
  lines.push(
    lang === 'ne'
      ? '#NepalRepublic #नेपाल #जवाफदेहिता'
      : '#NepalRepublic #Nepal #GovAccountability',
  );

  return lines.join('\n');
}

function generateWhatsAppPost(
  day: number,
  stats: StatsSnapshot,
  score: number,
  lang: Lang,
  briefSummary?: string,
): string {
  const lines = lang === 'ne'
    ? [
        `*\u{1F1F3}\u{1F1F5} Nepal Republic — दिन ${day} अपडेट*`,
        '',
        `\u{1F4CA} स्कोर: ${score}/100`,
        `\u2705 ${stats.delivered} पूरा`,
        `\u{1F504} ${stats.inProgress} प्रगतिमा`,
        `\u23F8 ${stats.stalled} रोकिएको`,
      ]
    : [
        `*\u{1F1F3}\u{1F1F5} Nepal Republic \u2014 Day ${day} Update*`,
        '',
        `\u{1F4CA} Score: ${score}/100`,
        `\u2705 ${stats.delivered} delivered`,
        `\u{1F504} ${stats.inProgress} moving`,
        `\u23F8 ${stats.stalled} stalled`,
      ];

  if (briefSummary) {
    lines.push('');
    lines.push(briefSummary);
  }

  lines.push('');
  lines.push(`\u{1F449} nepalrepublic.org`);

  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const platform = (searchParams.get('platform') || 'twitter') as Platform;
  const lang = (searchParams.get('lang') || 'en') as Lang;

  // Validate platform
  if (!['twitter', 'facebook', 'whatsapp'].includes(platform)) {
    return NextResponse.json(
      { error: 'Invalid platform. Use twitter, facebook, or whatsapp.' },
      { status: 400 },
    );
  }

  // Validate lang
  if (!['en', 'ne'].includes(lang)) {
    return NextResponse.json(
      { error: 'Invalid lang. Use en or ne.' },
      { status: 400 },
    );
  }

  // Compute stats from live public commitments (fallback: static)
  let commitmentRecords: GovernmentPromise[] = promises;
  try {
    const liveCommitments = await getPromises();
    const publicCommitments = liveCommitments.filter((c) => isPublicCommitment(c));
    if (publicCommitments.length > 0) {
      commitmentRecords = publicCommitments;
    } else if (liveCommitments.length > 0) {
      commitmentRecords = liveCommitments;
    }
  } catch {
    commitmentRecords = promises;
  }

  const stats = computeStats(commitmentRecords);
  const scoreResult = computeGhantiScore(commitmentRecords);
  const score = scoreResult.score;
  const day = getDayNumber();

  // Try to fetch daily brief summary
  let briefSummary: string | undefined;
  try {
    const baseUrl = request.nextUrl.origin;
    const briefRes = await fetch(`${baseUrl}/api/daily-brief`, {
      cache: 'no-store',
    });
    if (briefRes.ok) {
      const briefData = await briefRes.json();
      briefSummary = pickBriefSummary(briefData, lang);
    }
  } catch {
    // Silently fall back — no brief summary
  }

  // Generate platform-specific post
  let post: string;
  switch (platform) {
    case 'facebook':
      post = generateFacebookPost(day, stats, score, lang, briefSummary);
      break;
    case 'whatsapp':
      post = generateWhatsAppPost(day, stats, score, lang, briefSummary);
      break;
    case 'twitter':
    default:
      post = generateTwitterPost(day, stats, lang, briefSummary);
      break;
  }

  const response = {
    platform,
    lang,
    post,
    characterCount: post.length,
    imageUrl: `${request.nextUrl.origin}/api/report-card`,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}
