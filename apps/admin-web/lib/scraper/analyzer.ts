/**
 * AI-powered article analyzer for Nepal Najar.
 *
 * Uses an OpenAI-compatible API (LM Studio local Qwen 3.5, OpenRouter, etc.)
 * to deeply analyze scraped articles and extract governance intelligence.
 *
 * Environment variables:
 *   AI_BASE_URL     — e.g. "http://localhost:1234/v1" (LM Studio) or "https://openrouter.ai/api/v1"
 *   AI_API_KEY      — API key (use "lm-studio" for local, real key for OpenRouter)
 *   AI_MODEL        — e.g. "qwen3.5-27b" (local) or "qwen/qwen3-30b-a3b" (OpenRouter)
 */

import { promises as allPromises } from '@/lib/data/promises';

/** AI analysis result for a single article */
export interface ArticleAnalysis {
  /** Promise IDs this article is relevant to */
  relevantPromiseIds: string[];
  /** For each matched promise: does this confirm, contradict, or is neutral? */
  promiseSignals: Array<{
    promiseId: string;
    signal: 'confirms' | 'contradicts' | 'neutral';
    confidence: number; // 0-1
    /** Extracted data point if any (e.g. "65% complete", "NPR 2.5 billion spent") */
    extractedData?: string;
    /** Brief reason for the signal */
    reasoning: string;
  }>;
  /** Overall summary of the article in 1-2 sentences */
  summary: string;
  /** Summary in Nepali */
  summary_ne?: string;
  /** Key data points extracted (budget figures, percentages, dates, names) */
  keyFacts: string[];
  /** Article category */
  category: 'governance' | 'economy' | 'infrastructure' | 'social' | 'environment' | 'other';
}

/** Build the system prompt with promise context */
function buildSystemPrompt(): string {
  // Give the AI a concise list of all promises to match against
  const promiseList = allPromises
    .map((p) => `[${p.id}] ${p.title} (${p.category}) — ${p.description}`)
    .join('\n');

  return `You are a Nepal governance analyst for Nepal Najar (नेपाल नजर), a promise tracker for Nepal's government.

You analyze news articles and government announcements to track progress on government promises from RSP's "बाचा पत्र 2082" (Citizen Contract).

Here are the 32 government promises you are tracking:
${promiseList}

Your job:
1. Determine which promises (if any) are relevant to the article
2. For each relevant promise, determine if the article CONFIRMS progress, CONTRADICTS (shows failure/delay), or is NEUTRAL
3. Extract key data points: percentages, budget amounts (NPR), completion dates, official names
4. Provide a brief 1-2 sentence summary
5. Assign confidence scores (0-1) based on source reliability and specificity

Respond in valid JSON only. No markdown, no explanation outside JSON.`;
}

/** Build the user prompt for a specific article */
function buildUserPrompt(article: {
  headline: string;
  content: string;
  source_name: string;
  source_type: 'news' | 'government';
}): string {
  return `Analyze this ${article.source_type === 'government' ? 'government announcement' : 'news article'} from ${article.source_name}:

HEADLINE: ${article.headline}

CONTENT:
${article.content.slice(0, 3000)}

Respond with this exact JSON structure:
{
  "relevantPromiseIds": ["1", "15"],
  "promiseSignals": [
    {
      "promiseId": "15",
      "signal": "confirms",
      "confidence": 0.8,
      "extractedData": "38% of highway widening completed",
      "reasoning": "Article reports progress on East-West Highway 4-lane expansion"
    }
  ],
  "summary": "Brief 1-2 sentence summary of the article",
  "summary_ne": "नेपालीमा संक्षिप्त सारांश",
  "keyFacts": ["38% completed", "NPR 650 crore spent", "Target: 2028"],
  "category": "infrastructure"
}

If the article is not relevant to any tracked promise, return:
{
  "relevantPromiseIds": [],
  "promiseSignals": [],
  "summary": "Brief summary",
  "keyFacts": [],
  "category": "other"
}`;
}

/** Check if AI service is configured */
export function isAIConfigured(): boolean {
  return !!(process.env.AI_BASE_URL && process.env.AI_MODEL);
}

/** Get AI configuration */
function getAIConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:1234/v1',
    apiKey: process.env.AI_API_KEY || 'lm-studio',
    model: process.env.AI_MODEL || 'qwen3.5-27b',
  };
}

/**
 * Analyze an article using the AI model.
 * Works with any OpenAI-compatible API (LM Studio, OpenRouter, Together, etc.)
 */
export async function analyzeArticle(article: {
  headline: string;
  content: string;
  source_name: string;
  source_type: 'news' | 'government';
}): Promise<ArticleAnalysis> {
  const config = getAIConfig();

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(article) },
        ],
        temperature: 0.1, // Low temp for factual extraction
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(120000), // 120s timeout for local AI model
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty AI response');
    }

    // Parse JSON response — handle potential markdown wrapping
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as ArticleAnalysis;

    // Validate and sanitize
    return {
      relevantPromiseIds: Array.isArray(parsed.relevantPromiseIds)
        ? parsed.relevantPromiseIds.filter((id) =>
            allPromises.some((p) => p.id === id)
          )
        : [],
      promiseSignals: Array.isArray(parsed.promiseSignals)
        ? parsed.promiseSignals
            .filter((s) => allPromises.some((p) => p.id === s.promiseId))
            .map((s) => ({
              promiseId: s.promiseId,
              signal: ['confirms', 'contradicts', 'neutral'].includes(s.signal)
                ? s.signal
                : 'neutral',
              confidence: Math.min(Math.max(Number(s.confidence) || 0.5, 0), 1),
              extractedData: s.extractedData || undefined,
              reasoning: s.reasoning || '',
            }))
        : [],
      summary: parsed.summary || article.headline,
      summary_ne: parsed.summary_ne || undefined,
      keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [],
      category: [
        'governance',
        'economy',
        'infrastructure',
        'social',
        'environment',
        'other',
      ].includes(parsed.category)
        ? parsed.category
        : 'other',
    };
  } catch (err) {
    console.error('[analyzer] AI analysis failed:', err);
    // Return a safe fallback — no matches
    return {
      relevantPromiseIds: [],
      promiseSignals: [],
      summary: article.headline,
      keyFacts: [],
      category: 'other',
    };
  }
}

/**
 * Batch analyze multiple articles.
 * Processes sequentially to avoid overwhelming the AI model.
 */
export async function analyzeArticles(
  articles: Array<{
    id: string;
    headline: string;
    content: string;
    source_name: string;
    source_type: 'news' | 'government';
  }>
): Promise<Map<string, ArticleAnalysis>> {
  const results = new Map<string, ArticleAnalysis>();

  for (const article of articles) {
    const analysis = await analyzeArticle(article);
    results.set(article.id, analysis);

    // Small delay between API calls to be respectful
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
