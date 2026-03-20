/**
 * POST /api/scrape/analyze — The Brain
 * Processes unanalyzed articles through AI (Qwen via LM Studio).
 * Designed to be called in batches — run in a loop until remaining=0.
 *
 * Body: { batchSize?: number }
 * Auth: Bearer SCRAPE_SECRET
 */
import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/server';
import { readFullArticle } from '@/lib/scraper/deep-reader';
import { analyzeArticle, isAIConfigured } from '@/lib/scraper/analyzer';
import { matchArticleToPromises } from '@/lib/scraper/matcher';
import { recomputePromiseStatus } from '@/lib/scraper/promise-recomputer';

export const maxDuration = 300; // 5 min for local model processing

export async function POST(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const aiEnabled = isAIConfigured();
  if (!aiEnabled) {
    return NextResponse.json(
      { error: 'AI not configured. Set AI_BASE_URL, AI_API_KEY, AI_MODEL in .env.local' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 5, 20); // Max 20 per batch

    const startTime = Date.now();

    // Fetch unprocessed articles (prioritize those with keyword matches first)
    const { data: articles, error: fetchErr } = await supabase
      .from('scraped_articles')
      .select('id, source_url, source_name, source_type, headline, headline_ne, content_excerpt, language, promise_ids, confidence')
      .eq('is_processed', false)
      .order('confidence', { ascending: false }) // Process keyword-matched first
      .limit(batchSize);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!articles || articles.length === 0) {
      // Count total for stats
      const { count: total } = await supabase
        .from('scraped_articles')
        .select('id', { count: 'exact', head: true });

      return NextResponse.json({
        message: 'No unprocessed articles remaining',
        processed: 0,
        remaining: 0,
        totalArticles: total || 0,
        durationMs: Date.now() - startTime,
      });
    }

    const results = {
      processed: 0,
      aiAnalyzed: 0,
      keywordOnly: 0,
      promisesUpdated: 0,
      errors: [] as string[],
      analyses: [] as Array<{
        headline: string;
        promiseIds: string[];
        confidence: number;
        summary?: string;
        keyFacts?: string[];
      }>,
    };

    for (const article of articles) {
      try {
        console.log(`[analyze] Processing: ${article.headline?.substring(0, 60)}...`);

        // Step 1: Try to read full article content
        let fullText = article.content_excerpt || '';
        let headline = article.headline;

        try {
          const full = await readFullArticle(article.source_url, article.language || 'en');
          if (full && full.fullText.length > 100) {
            fullText = full.fullText;
            headline = full.headline || headline;

            // Save the full content excerpt
            await supabase
              .from('scraped_articles')
              .update({
                content_excerpt: fullText.slice(0, 1000),
                published_at: full.publishedDate || undefined,
              })
              .eq('id', article.id);
          }
        } catch {
          console.warn(`[analyze] Could not read full article: ${article.source_url}`);
        }

        // Step 2: AI Analysis
        if (fullText.length > 50) {
          const analysis = await analyzeArticle({
            headline,
            content: fullText,
            source_name: article.source_name,
            source_type: (article.source_type as 'news' | 'government') || 'news',
          });

          const bestConfidence =
            analysis.promiseSignals.length > 0
              ? Math.max(...analysis.promiseSignals.map((s) => s.confidence))
              : 0;

          const bestClassification =
            analysis.promiseSignals.length > 0
              ? analysis.promiseSignals[0].signal
              : 'neutral';

          // Merge AI results with existing keyword matches
          const allPromiseIds = [
            ...new Set([
              ...analysis.relevantPromiseIds,
              ...((article.promise_ids as string[]) || []),
            ]),
          ];

          await supabase
            .from('scraped_articles')
            .update({
              promise_ids: allPromiseIds,
              confidence: Math.max(bestConfidence, article.confidence || 0),
              classification: bestClassification,
              content_excerpt:
                analysis.summary +
                (analysis.keyFacts.length > 0
                  ? '\n\nKey facts: ' + analysis.keyFacts.join(', ')
                  : ''),
              is_processed: true,
            })
            .eq('id', article.id);

          // Create promise_updates for high-confidence signals
          for (const signal of analysis.promiseSignals) {
            if (signal.confidence >= 0.3) {
              await supabase.from('promise_updates').insert({
                promise_id: signal.promiseId,
                article_id: article.id,
                field_changed: 'evidence',
                old_value: null,
                new_value: signal.extractedData || signal.reasoning,
                change_reason: `${signal.signal} (confidence: ${signal.confidence.toFixed(2)}) — ${article.source_name}`,
              });
              results.promisesUpdated++;
            }
          }

          results.aiAnalyzed++;
          results.analyses.push({
            headline: article.headline,
            promiseIds: allPromiseIds,
            confidence: Math.max(bestConfidence, article.confidence || 0),
            summary: analysis.summary,
            keyFacts: analysis.keyFacts,
          });
        } else {
          // Not enough content for AI — just use keyword matcher
          const match = matchArticleToPromises({
            headline: article.headline,
            headline_ne: article.headline_ne,
            content_excerpt: fullText,
          });

          await supabase
            .from('scraped_articles')
            .update({
              promise_ids: match.promiseIds,
              confidence: match.confidence,
              classification: match.classification,
              is_processed: true,
            })
            .eq('id', article.id);

          results.keywordOnly++;
        }

        results.processed++;
      } catch (err) {
        const msg = `${article.headline?.substring(0, 40)}: ${err instanceof Error ? err.message : String(err)}`;
        results.errors.push(msg);
        console.error(`[analyze] Error:`, msg);

        // Mark as processed to avoid infinite retry
        await supabase
          .from('scraped_articles')
          .update({ is_processed: true })
          .eq('id', article.id);

        results.processed++;
      }

      // Breathing room for local model
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Recompute affected promises from real evidence
    const affectedPromiseIds = new Set<string>();
    for (const analysis of results.analyses) {
      for (const pid of analysis.promiseIds) {
        affectedPromiseIds.add(pid);
      }
    }
    let promisesRecomputed = 0;
    for (const pid of affectedPromiseIds) {
      const metrics = await recomputePromiseStatus(pid);
      if (metrics) promisesRecomputed++;
    }

    // Count remaining unprocessed
    const { count: remaining } = await supabase
      .from('scraped_articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_processed', false);

    return NextResponse.json({
      ...results,
      promisesRecomputed,
      remaining: remaining || 0,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
