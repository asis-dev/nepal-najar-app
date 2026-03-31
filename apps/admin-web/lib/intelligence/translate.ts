/**
 * Nepali → English translation for intelligence signals.
 * Uses Gemini Flash (free tier) to translate Nepali titles and content summaries.
 * Called after Tier 1 classification for relevant Nepali signals.
 */

import { aiComplete } from './ai-router';
import { getSupabase } from '@/lib/supabase/server';

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

export async function translatePendingNepaliSignals(limit = 20): Promise<{
  scanned: number;
  translated: number;
  failed: number;
}> {
  const supabase = getSupabase();
  const batchLimit = Math.max(1, Math.min(limit, 100));

  const { data: nepaliSignals, error } = await supabase
    .from('intelligence_signals')
    .select('id, title, content, content_summary, metadata')
    .eq('language', 'ne')
    .eq('tier1_processed', true)
    .gte('relevance_score', 0.3)
    .order('discovered_at', { ascending: false })
    .limit(Math.min(batchLimit * 5, 500));

  if (error) {
    throw new Error(`Failed to load Nepali translation backlog: ${error.message}`);
  }

  if (!nepaliSignals || nepaliSignals.length === 0) {
    return { scanned: 0, translated: 0, failed: 0 };
  }

  const candidates = nepaliSignals
    .filter((signal) => {
      const metadata =
        signal.metadata &&
        typeof signal.metadata === 'object' &&
        !Array.isArray(signal.metadata)
          ? (signal.metadata as Record<string, unknown>)
          : {};
      const translationMeta =
        metadata.translation &&
        typeof metadata.translation === 'object' &&
        !Array.isArray(metadata.translation)
          ? (metadata.translation as Record<string, unknown>)
          : {};
      const existingTitleEn = translationMeta.title_en;
      const hasTitleEn =
        typeof existingTitleEn === 'string' && existingTitleEn.trim().length > 0;
      const hasSummary =
        typeof signal.content_summary === 'string' &&
        signal.content_summary.trim().length > 0;
      return !hasTitleEn || !hasSummary;
    })
    .slice(0, batchLimit);

  if (candidates.length === 0) {
    return { scanned: 0, translated: 0, failed: 0 };
  }

  const translated = await batchTranslateNepaliSignals(
    candidates.map((signal) => ({
      id: signal.id as string,
      title: signal.title as string,
      content: (signal.content as string | null) || undefined,
    })),
  );

  let translatedCount = 0;
  let failedCount = 0;
  const nowIso = new Date().toISOString();

  for (const signal of candidates) {
    const translation = translated.get(signal.id as string);
    if (!translation) {
      failedCount++;
      continue;
    }

    const existingMetadata =
      signal.metadata && typeof signal.metadata === 'object' && !Array.isArray(signal.metadata)
        ? (signal.metadata as Record<string, unknown>)
        : {};

    const existingTranslationMeta =
      existingMetadata.translation &&
      typeof existingMetadata.translation === 'object' &&
      !Array.isArray(existingMetadata.translation)
        ? (existingMetadata.translation as Record<string, unknown>)
        : {};

    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      translation: {
        ...existingTranslationMeta,
        title_en: translation.titleEn || signal.title,
        translated_at: nowIso,
      },
    };

    const { error: updateError } = await supabase
      .from('intelligence_signals')
      .update({
        content_summary:
          signal.content_summary && signal.content_summary.trim().length > 0
            ? signal.content_summary
            : translation.summaryEn && translation.summaryEn.trim().length > 0
            ? translation.summaryEn.trim()
            : signal.content_summary,
        metadata: updatedMetadata,
      })
      .eq('id', signal.id);

    if (updateError) {
      failedCount++;
    } else {
      translatedCount++;
    }
  }

  return {
    scanned: candidates.length,
    translated: translatedCount,
    failed: failedCount,
  };
}
