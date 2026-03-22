/**
 * Nepali → English translation for intelligence signals.
 * Uses Gemini Flash (free tier) to translate Nepali titles and content summaries.
 * Called after Tier 1 classification for relevant Nepali signals.
 */

import { aiComplete } from './ai-router';

export interface TranslationResult {
  titleEn: string;
  summaryEn: string;
}

/**
 * Translate a Nepali signal's title and content to English.
 * Uses Gemini Flash for cost-effective translation.
 */
export async function translateNepaliSignal(
  title: string,
  content?: string,
): Promise<TranslationResult> {
  const prompt = `Translate the following Nepali text to clear, natural English.
Preserve all proper nouns (people names, place names, organization names) in their standard English transliterations.
Preserve numbers and monetary amounts exactly.
Return ONLY a JSON object with "titleEn" and "summaryEn" fields. No other text.

Title (Nepali): ${title}

${content ? `Content (first 1500 chars): ${content.slice(0, 1500)}` : 'No content available.'}

If content is provided, "summaryEn" should be a 2-3 sentence English summary of the content.
If no content, "summaryEn" should be an expanded version of the title.`;

  try {
    const response = await aiComplete(
      'summarize', // uses Gemini Flash (free)
      'You are a professional Nepali-to-English translator specializing in government and political news. Return valid JSON only.',
      prompt,
    );

    // Parse JSON response
    const cleaned = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      titleEn: parsed.titleEn || title,
      summaryEn: parsed.summaryEn || '',
    };
  } catch (error) {
    console.warn('[translate] Failed to translate Nepali signal:', error);
    return {
      titleEn: title, // fallback to original
      summaryEn: '',
    };
  }
}

/**
 * Batch translate multiple Nepali signals.
 * Processes sequentially with 500ms delay to respect rate limits.
 */
export async function batchTranslateNepaliSignals(
  signals: Array<{ id: string; title: string; content?: string }>,
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();

  for (const signal of signals) {
    try {
      const translation = await translateNepaliSignal(
        signal.title,
        signal.content,
      );
      results.set(signal.id, translation);
      // Rate limit: 500ms between translations
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.warn(`[translate] Failed for signal ${signal.id}:`, error);
      results.set(signal.id, { titleEn: signal.title, summaryEn: '' });
    }
  }

  return results;
}
