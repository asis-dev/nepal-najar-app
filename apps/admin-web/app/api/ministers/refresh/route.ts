import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { aiComplete } from '@/lib/intelligence/ai-router';
import { validateScrapeAuth } from '@/lib/scraper/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

/**
 * GET /api/ministers/refresh
 *
 * Daily cron job: refreshes minister profiles that are older than 7 days.
 * Uses OpenAI to generate structured profiles with verification status.
 * Designed to run once daily at Nepal 7 PM (13:15 UTC).
 */
export async function GET(req: NextRequest) {
  // Auth check — Vercel cron or scrape/admin auth
  const isCron = req.headers.get('x-vercel-cron') === '1';
  const isScrapeOrAdmin = await validateScrapeAuth(req);

  if (!isCron && !isScrapeOrAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Fetch current ministers
  const { data: ministers, error } = await supabase
    .from('government_roster')
    .select('id, name, name_ne, title, title_ne, ministry, ministry_slug, metadata')
    .eq('is_current', true)
    .order('ministry_slug');

  if (error || !ministers) {
    return NextResponse.json({ error: 'Failed to fetch ministers' }, { status: 500 });
  }

  const results: { name: string; status: string }[] = [];
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (const minister of ministers) {
    // Skip if profile is recent (< 7 days old)
    const existing = minister.metadata?.profile;
    if (existing?.profileGeneratedAt) {
      const age = Date.now() - new Date(existing.profileGeneratedAt).getTime();
      if (age < SEVEN_DAYS_MS) {
        results.push({ name: minister.name, status: `skipped (${Math.round(age / 86400000)}d old)` });
        continue;
      }
    }

    try {
      const profile = await generateMinisterProfile({
        name: minister.name,
        nameNe: minister.name_ne,
        title: minister.title,
        ministry: minister.ministry,
      });

      if (profile) {
        const updatedMetadata = {
          ...(minister.metadata || {}),
          profile,
        };

        const { error: updateErr } = await supabase
          .from('government_roster')
          .update({ metadata: updatedMetadata })
          .eq('id', minister.id);

        if (updateErr) {
          results.push({ name: minister.name, status: `db error: ${updateErr.message}` });
        } else {
          results.push({ name: minister.name, status: 'updated' });
        }
      } else {
        results.push({ name: minister.name, status: 'ai failed' });
      }
    } catch (err) {
      results.push({ name: minister.name, status: `error: ${err instanceof Error ? err.message : 'unknown'}` });
    }

    // Rate limit between ministers
    await new Promise(r => setTimeout(r, 2000));
  }

  return NextResponse.json({
    total: ministers.length,
    updated: results.filter(r => r.status === 'updated').length,
    skipped: results.filter(r => r.status.startsWith('skipped')).length,
    failed: results.filter(r => !r.status.startsWith('skipped') && r.status !== 'updated').length,
    results,
  });
}

async function generateMinisterProfile(minister: {
  name: string;
  nameNe: string | null;
  title: string;
  ministry: string;
}) {
  const systemPrompt = `You are a political researcher specializing in Nepal's government. You provide factual, well-sourced profiles of government officials.

IMPORTANT RULES:
- Only include information you are reasonably confident about
- Mark each claim with verification status: "confirmed" (well-documented public record), "reported" (reported by credible media but not officially confirmed), or "unverified" (commonly stated but hard to verify)
- For estimated net worth, ALWAYS include the source
- Be specific about education institutions and degrees
- Include political party affiliation
- List key positions in chronological order
- For controversies, include current legal status if applicable
- Keep biography concise (2-3 sentences)
- Respond ONLY with valid JSON, no markdown fences`;

  const userPrompt = `Generate a detailed profile for this Nepal government official:

Name: ${minister.name}
Nepali Name: ${minister.nameNe || 'N/A'}
Current Title: ${minister.title}
Ministry: ${minister.ministry}

Return a JSON object with this exact structure:
{
  "bio": "2-3 sentence biography in English",
  "bioNe": "Same bio in Nepali (if possible, otherwise null)",
  "education": [
    { "degree": "degree name", "institution": "school/university name", "year": "graduation year or null", "verified": "confirmed|reported|unverified" }
  ],
  "politicalCareer": [
    { "role": "position held", "period": "2020-2024 or similar", "details": "brief context", "verified": "confirmed|reported|unverified" }
  ],
  "estimatedNetWorth": { "amount": "amount in NPR or USD", "source": "where this info comes from", "year": "year of declaration", "verified": "confirmed|reported|unverified" },
  "achievements": [
    { "description": "notable achievement", "year": "year", "verified": "confirmed|reported|unverified" }
  ],
  "controversies": [
    { "description": "controversy or legal issue", "year": "year", "status": "resolved|ongoing|acquitted|under investigation", "verified": "confirmed|reported|unverified" }
  ],
  "personalInfo": {
    "birthDate": "YYYY-MM-DD or null",
    "birthPlace": "district/city",
    "party": "political party name",
    "constituency": "electoral constituency if applicable"
  }
}

If you don't have reliable information about a field, use null or empty array. Do NOT make up facts.`;

  try {
    const response = await aiComplete('summarize', systemPrompt, userPrompt);
    const cleaned = response.content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const profile = JSON.parse(jsonMatch[0]);
    return {
      ...profile,
      profileGeneratedAt: new Date().toISOString(),
      aiModel: response.model,
    };
  } catch {
    return null;
  }
}
