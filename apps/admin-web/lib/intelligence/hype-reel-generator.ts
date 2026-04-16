/**
 * Hype Reel Generator — turns daily brief into viral 15s video data
 *
 * Takes the #1 trending story from the daily brief and transforms it into
 * a punchy, provocative, hype-style video format designed for maximum
 * engagement on Facebook Reels / TikTok / YouTube Shorts.
 *
 * Key design:
 * - Pick ONE story (the most engaging, not necessarily the "most important")
 * - Write hooks that stop the scroll in 1 second
 * - Facts that make people go "wait WHAT?"
 * - End with a question that FORCES comments
 */

import { aiComplete } from './ai-router';
import { dayInOffice } from './government-era';
import type { DailyBrief } from './daily-brief';
import type { HypeReelData } from '@/remotion/types';

// ── Story ranking for virality (not importance) ──────────────────────────────

interface RankedStory {
  story: DailyBrief['topStories'][0];
  viralScore: number;
  reason: string;
}

function rankStoriesForVirality(stories: DailyBrief['topStories']): RankedStory[] {
  return stories.map((story) => {
    let score = 0;
    let reason = '';

    // Negative sentiment = controversy = engagement
    if (story.sentiment === 'negative') { score += 40; reason = 'controversy'; }
    if (story.sentiment === 'mixed') { score += 25; reason = 'debate'; }

    // More sources = bigger story = more people already care
    score += Math.min(30, story.signalCount * 6);

    // Higher importance from AI = more newsworthy
    score += (story.importance || 50) * 0.3;

    // Stories linked to commitments = accountability angle (our unique value)
    if (story.relatedCommitments.length > 0) { score += 20; reason += '+accountability'; }

    // Longer summaries = more substance to work with
    if ((story.summary?.length || 0) > 100) score += 10;

    return { story, viralScore: score, reason: reason || 'general' };
  }).sort((a, b) => b.viralScore - a.viralScore);
}

// ── AI-powered hype content generation ───────────────────────────────────────

async function generateHypeContent(
  story: DailyBrief['topStories'][0],
  brief: DailyBrief,
): Promise<{
  hookNe: string;
  hookEn: string;
  hookEmoji: string;
  facts: Array<{ textNe: string; textEn: string; highlight?: string }>;
  questionNe: string;
  questionEn: string;
  category: HypeReelData['category'];
}> {
  const prompt = `You are a viral Nepali news video creator. Your videos get MILLIONS of views because you know exactly how to hook people.

Given this news story, create HYPE content for a 15-second video reel.

STORY:
Title: ${story.title}
Title (Nepali): ${story.titleNe || 'N/A'}
Summary: ${story.summary}
Summary (Nepali): ${story.summaryNe || 'N/A'}
Sentiment: ${story.sentiment}
Sources: ${story.signalCount} sources covering this
Related government commitments: ${story.relatedCommitments.length > 0 ? story.relatedCommitments.join(', ') : 'none'}

TODAY'S CONTEXT:
Date: ${brief.date}
Day ${dayInOffice()} of new government
Total signals today: ${brief.stats.newSignals}

RULES:
1. The HOOK must stop someone mid-scroll in 1 SECOND. It must be shocking, surprising, or outrage-inducing.
2. Write in NATURAL Nepali (Devanagari) — the way young Nepalis actually talk, not formal bureaucratic Nepali.
3. Facts should make people go "WHAT?!" — pick the most surprising numbers or claims.
4. The question at the end MUST be divisive — people should HAVE to comment their opinion.
5. Keep everything SHORT. This is 15 seconds. Every word must earn its place.
6. DO NOT use generic phrases like "important development" or "significant progress."

RESPOND IN THIS EXACT JSON FORMAT:
{
  "hookNe": "Nepali headline (max 15 words, Devanagari, shocking/provocative)",
  "hookEn": "English headline (max 12 words, punchy)",
  "hookEmoji": "single emoji that fits (🔴 🚨 ⚡ 🔥 💥 😱 🤯)",
  "facts": [
    {"textNe": "Nepali fact 1 (max 12 words)", "textEn": "English fact 1", "highlight": "key number or word shown BIG"},
    {"textNe": "Nepali fact 2 (max 12 words)", "textEn": "English fact 2", "highlight": "key number or word shown BIG"}
  ],
  "questionNe": "Provocative Nepali question that FORCES comments (max 15 words, Devanagari)",
  "questionEn": "English version of the question",
  "category": "breaking|scandal|progress|failure|milestone"
}

ONLY output valid JSON. No markdown, no explanation.`;

  const response = await aiComplete(
    'summarize',
    'You are a viral Nepali news video creator. Respond only in valid JSON.',
    prompt,
  );

  // Parse AI response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON for hype content');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    hookNe: parsed.hookNe || story.titleNe || story.title,
    hookEn: parsed.hookEn || story.title,
    hookEmoji: parsed.hookEmoji || '🔴',
    facts: (parsed.facts || []).slice(0, 3).map((f: any) => ({
      textNe: f.textNe || '',
      textEn: f.textEn || '',
      highlight: f.highlight || undefined,
    })),
    questionNe: parsed.questionNe || 'तपाईंको विचार के छ?',
    questionEn: parsed.questionEn || 'What do you think?',
    category: parsed.category || 'breaking',
  };
}

// ── Fallback (no AI) — deterministic hype from brief data ────────────────────

function generateFallbackHypeContent(
  story: DailyBrief['topStories'][0],
  brief: DailyBrief,
): Omit<HypeReelData, 'date' | 'dayNumber' | 'grade' | 'gradeChange' | 'previousGrade'> {
  const hookNe = story.titleNe || story.title;
  const hookEn = story.title;
  const hookEmoji = story.sentiment === 'negative' ? '🚨'
    : story.sentiment === 'positive' ? '⚡'
    : '🔴';

  const facts: HypeReelData['facts'] = [];

  // Fact 1: signal count
  facts.push({
    textNe: `${story.signalCount} स्रोतले यो कुरा पुष्टि गरेका छन्`,
    textEn: `${story.signalCount} sources confirmed this story`,
    highlight: `${story.signalCount}`,
  });

  // Fact 2: from summary
  if (story.summaryNe || story.summary) {
    const sumText = story.summaryNe || story.summary;
    const firstSentence = sumText.split(/[।.!?]/)[0]?.trim();
    if (firstSentence) {
      facts.push({
        textNe: firstSentence.slice(0, 60),
        textEn: (story.summary || '').split(/[.!?]/)[0]?.trim().slice(0, 60) || '',
      });
    }
  }

  // Fact 3: today's signals
  facts.push({
    textNe: `आज ${brief.stats.newSignals} नयाँ संकेत भेटियो`,
    textEn: `${brief.stats.newSignals} new signals detected today`,
    highlight: `${brief.stats.newSignals}`,
  });

  const category: HypeReelData['category'] = story.sentiment === 'negative' ? 'failure'
    : story.sentiment === 'positive' ? 'progress'
    : story.sentiment === 'mixed' ? 'scandal'
    : 'breaking';

  return {
    hook: {
      textNe: hookNe,
      textEn: hookEn,
      emoji: hookEmoji,
      faceImage: 'images/politicians/balen-shah.jpg',
      faceName: 'PM Balen Shah',
      faceNameNe: 'प्रम बालेन शाह',
      faceRole: 'प्रधानमन्त्री',
    },
    facts: facts.slice(0, 3),
    questionNe: 'तपाईंको विचार के छ? कमेन्टमा भन्नुहोस्!',
    questionEn: 'What do you think? Tell us in the comments!',
    category,
  };
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate HypeReelData from a DailyBrief.
 *
 * 1. Ranks all stories by viral potential (not just importance)
 * 2. Picks the #1 most engaging story
 * 3. Uses AI to generate provocative hook, facts, and question
 * 4. Falls back to deterministic content if AI fails
 */
export async function generateHypeReelData(
  brief: DailyBrief,
  options?: {
    /** Override which story to use (0-indexed) */
    storyIndex?: number;
    /** Skip AI and use deterministic content */
    skipAI?: boolean;
    /** Include grade data */
    grade?: string;
    gradeChange?: 'up' | 'down' | 'same';
    previousGrade?: string;
  },
): Promise<HypeReelData> {
  if (brief.topStories.length === 0) {
    // No stories — return a "no news" reel
    return {
      date: brief.date,
      dayNumber: dayInOffice(),
      hook: {
        textNe: 'आज सरकारबाट कुनै ठूलो खबर आएन',
        textEn: 'No major government news today',
        emoji: '🤔',
        faceImage: 'images/politicians/balen-shah.jpg',
        faceName: 'PM Balen Shah',
        faceNameNe: 'प्रम बालेन शाह',
        faceRole: 'प्रधानमन्त्री',
      },
      facts: [
        {
          textNe: `सरकारको ${dayInOffice()} औं दिन — शान्त`,
          textEn: `Day ${dayInOffice()} — quiet day`,
          highlight: `Day ${dayInOffice()}`,
        },
      ],
      questionNe: 'शान्त दिन राम्रो कि नराम्रो?',
      questionEn: 'Is a quiet day good or bad?',
      category: 'breaking',
    };
  }

  // Rank stories by viral potential
  const ranked = rankStoriesForVirality(brief.topStories);
  const storyIdx = options?.storyIndex ?? 0;
  const chosenStory = ranked[Math.min(storyIdx, ranked.length - 1)].story;

  console.log(`[HypeReel] Picked story: "${chosenStory.title}" (viral score: ${ranked[0].viralScore}, reason: ${ranked[0].reason})`);

  let hypeContent: Omit<HypeReelData, 'date' | 'dayNumber' | 'grade' | 'gradeChange' | 'previousGrade'>;

  if (options?.skipAI) {
    hypeContent = generateFallbackHypeContent(chosenStory, brief);
  } else {
    try {
      const aiContent = await generateHypeContent(chosenStory, brief);
      hypeContent = {
        hook: {
          textNe: aiContent.hookNe,
          textEn: aiContent.hookEn,
          emoji: aiContent.hookEmoji,
          faceImage: 'images/politicians/balen-shah.jpg',
          faceName: 'PM Balen Shah',
          faceNameNe: 'प्रम बालेन शाह',
          faceRole: 'प्रधानमन्त्री',
        },
        facts: aiContent.facts,
        questionNe: aiContent.questionNe,
        questionEn: aiContent.questionEn,
        category: aiContent.category,
      };
    } catch (err) {
      console.warn(`[HypeReel] AI content gen failed, using fallback: ${err instanceof Error ? err.message : 'unknown'}`);
      hypeContent = generateFallbackHypeContent(chosenStory, brief);
    }
  }

  return {
    date: brief.date,
    dayNumber: dayInOffice(),
    ...hypeContent,
    grade: options?.grade,
    gradeChange: options?.gradeChange,
    previousGrade: options?.previousGrade,
  };
}
