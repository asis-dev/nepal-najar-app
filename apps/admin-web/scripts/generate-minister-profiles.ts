/**
 * Generate Detailed Minister Profiles using AI
 *
 * Uses Qwen (via OpenRouter free tier) to research and structure
 * detailed profiles for each cabinet minister.
 *
 * Usage: npx tsx scripts/generate-minister-profiles.ts
 *
 * Each profile includes:
 * - Biography (education, career, political history)
 * - Estimated net worth (with source)
 * - Key positions held
 * - Notable achievements & controversies
 * - Family/personal info (public record only)
 * - Truth verification status for each claim
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'gemini-2.5-flash';

interface MinisterProfile {
  bio: string;
  bioNe?: string;
  education: Array<{ degree: string; institution: string; year?: string; verified: 'confirmed' | 'reported' | 'unverified' }>;
  politicalCareer: Array<{ role: string; period: string; details?: string; verified: 'confirmed' | 'reported' | 'unverified' }>;
  estimatedNetWorth?: { amount: string; source: string; year?: string; verified: 'confirmed' | 'reported' | 'unverified' };
  achievements: Array<{ description: string; year?: string; verified: 'confirmed' | 'reported' | 'unverified' }>;
  controversies: Array<{ description: string; year?: string; status?: string; verified: 'confirmed' | 'reported' | 'unverified' }>;
  personalInfo: {
    birthDate?: string;
    birthPlace?: string;
    party?: string;
    constituency?: string;
  };
  profileGeneratedAt: string;
  aiModel: string;
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // Use OpenAI directly (paid, reliable)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('No AI provider available (OPENAI_API_KEY not set)');
}

function extractJSON(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');
  return JSON.parse(jsonMatch[0]);
}

async function generateProfile(minister: { name: string; name_ne: string | null; title: string; ministry: string }): Promise<MinisterProfile | null> {
  const systemPrompt = `You are a political researcher specializing in Nepal's government. You provide factual, well-sourced profiles of government officials.

IMPORTANT RULES:
- Only include information you are reasonably confident about
- Mark each claim with verification status: "confirmed" (well-documented public record), "reported" (reported by credible media but not officially confirmed), or "unverified" (commonly stated but hard to verify)
- For estimated net worth, ALWAYS include the source (e.g., "CIAA property declaration 2024", "media reports")
- Be specific about education institutions and degrees
- Include political party affiliation
- List key positions in chronological order
- For controversies, include current legal status if applicable
- Keep biography concise (2-3 sentences)
- Respond ONLY with valid JSON, no markdown or explanation`;

  const userPrompt = `Generate a detailed profile for this Nepal government official:

Name: ${minister.name}
Nepali Name: ${minister.name_ne || 'N/A'}
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
    console.log(`  Generating profile for ${minister.name}...`);
    const response = await callAI(systemPrompt, userPrompt);
    const profile = extractJSON(response);

    return {
      ...profile,
      profileGeneratedAt: new Date().toISOString(),
      aiModel: MODEL,
    };
  } catch (err) {
    console.error(`  ERROR for ${minister.name}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function main() {
  console.log('=== Minister Profile Generator ===\n');

  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    console.error('ERROR: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY set in .env.local');
    process.exit(1);
  }
  console.log(`Using: OpenAI GPT-4.1-mini\n`);

  // Fetch current ministers
  const { data: ministers, error } = await supabase
    .from('government_roster')
    .select('id, name, name_ne, title, title_ne, ministry, ministry_slug, metadata')
    .eq('is_current', true)
    .order('ministry_slug');

  if (error || !ministers) {
    console.error('Failed to fetch ministers:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${ministers.length} current ministers\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const minister of ministers) {
    // Skip if profile already exists and is recent (< 7 days old)
    const existing = minister.metadata?.profile;
    if (existing?.profileGeneratedAt) {
      const age = Date.now() - new Date(existing.profileGeneratedAt).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000) {
        console.log(`  SKIP ${minister.name} — profile is ${Math.round(age / 86400000)}d old`);
        skipCount++;
        continue;
      }
    }

    const profile = await generateProfile(minister);

    if (profile) {
      // Merge profile into existing metadata
      const updatedMetadata = {
        ...(minister.metadata || {}),
        profile,
      };

      const { error: updateErr } = await supabase
        .from('government_roster')
        .update({ metadata: updatedMetadata })
        .eq('id', minister.id);

      if (updateErr) {
        console.error(`  DB ERROR for ${minister.name}:`, updateErr.message);
        failCount++;
      } else {
        console.log(`  ✓ ${minister.name} — profile saved`);
        successCount++;
      }
    } else {
      failCount++;
    }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Done ===`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Total credits used: ~${successCount} (1 per profile)`);
}

main().catch(console.error);
