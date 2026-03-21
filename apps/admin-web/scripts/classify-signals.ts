#!/usr/bin/env tsx
/**
 * Classify intelligence signals using Gemini AI
 * Usage: npx tsx scripts/classify-signals.ts
 *
 * Runs Tier 1 classification on all unprocessed signals,
 * matching them against the 35 government promises.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GEMINI_KEY) {
  console.error('Missing GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Promise Knowledge Base (compact) ──────────────────────────────

const PROMISES = [
  { id: 1, title: 'Directly Elected Executive System', keywords: 'presidential system, direct election, executive head, constitutional amendment' },
  { id: 2, title: 'Limit Federal Ministries to 18', keywords: 'ministry reduction, federal restructuring, government efficiency, cabinet size' },
  { id: 3, title: 'Allocate 60% Budget to Provincial & Local Governments', keywords: 'fiscal federalism, budget allocation, provincial budget, local government funding' },
  { id: 4, title: 'Investigate Assets of Public Officials Since 1990', keywords: 'asset investigation, corruption probe, CIAA, wealth audit, property investigation' },
  { id: 5, title: 'Mandatory Public Asset Disclosure', keywords: 'asset disclosure, property declaration, transparency, public officials wealth' },
  { id: 6, title: '100 Days 100 Works Plan', keywords: '100 days, quick wins, immediate action, government plan, priority tasks' },
  { id: 7, title: 'Public Procurement Transparency Portal', keywords: 'procurement, e-procurement, tender, contract transparency, public spending' },
  { id: 8, title: '7% Annual GDP Growth Target', keywords: 'GDP growth, economic growth, economic target, development rate' },
  { id: 9, title: 'Create 500,000 Jobs', keywords: 'employment, jobs, unemployment, labor market, youth employment' },
  { id: 10, title: 'Raise Exports to $30 Billion', keywords: 'exports, trade, export target, trade deficit, foreign trade' },
  { id: 11, title: 'Tax Reform — Reduce Citizen Burden', keywords: 'tax reform, tax reduction, taxation, VAT, income tax, tax policy' },
  { id: 12, title: 'Generate 30,000 MW Electricity in 10 Years', keywords: 'hydropower, electricity, MW, energy generation, power plant, dam' },
  { id: 13, title: 'Complete Melamchi Water Supply', keywords: 'Melamchi, water supply, Kathmandu water, drinking water, water project' },
  { id: 14, title: 'Complete All National Pride Projects in 2 Years', keywords: 'national pride project, rashtriya gaurav, mega project, infrastructure completion' },
  { id: 15, title: 'East-West Highway 4-Lane Expansion', keywords: 'highway, East-West, 4-lane, road expansion, Mahendra highway' },
  { id: 16, title: 'East-West Electric Railway', keywords: 'railway, electric rail, train, rail track, Mechi-Mahakali' },
  { id: 17, title: 'Operationalize Bhairahawa & Pokhara Airports', keywords: 'airport, Bhairahawa, Pokhara, Gautam Buddha, international airport' },
  { id: 18, title: '"Online, Not Queue" — Digital Government Services', keywords: 'digital government, e-governance, online services, paperless, digital Nepal' },
  { id: 19, title: 'Digital Parks in All 7 Provinces', keywords: 'IT park, digital park, tech hub, technology zone, province' },
  { id: 20, title: 'Declare IT as National Strategic Industry', keywords: 'IT industry, technology sector, strategic industry, software, BPO' },
  { id: 21, title: 'Cryptocurrency Regulation & Pilot', keywords: 'cryptocurrency, bitcoin, digital currency, blockchain, crypto regulation' },
  { id: 22, title: 'Universal Health Insurance — 100% Coverage', keywords: 'health insurance, universal health, medical coverage, health card' },
  { id: 23, title: 'Centralized National Ambulance Service', keywords: 'ambulance, emergency service, 102, medical transport, emergency response' },
  { id: 24, title: 'Free Education for Up to 3 Children', keywords: 'free education, school fee, education policy, public school, tuition' },
  { id: 25, title: '"Skill in Education" National Expansion', keywords: 'skill education, vocational, TVET, technical education, skill development' },
  { id: 26, title: 'Zero Dropout Rate — School Retention Program', keywords: 'dropout, school retention, enrollment, education access, child education' },
  { id: 27, title: 'Clean Kathmandu Valley Campaign', keywords: 'Kathmandu clean, waste management, pollution, valley cleanup, solid waste' },
  { id: 28, title: 'Bagmati & Major River Restoration', keywords: 'Bagmati, river cleanup, river restoration, water pollution, river conservation' },
  { id: 29, title: 'Land Reform — Commission in 100 Days', keywords: 'land reform, land commission, land ownership, landless, land rights' },
  { id: 30, title: 'Overseas Voting for Diaspora Nepalis', keywords: 'overseas voting, diaspora, NRN, foreign employment, migrant voting' },
  { id: 31, title: 'Cooperatives Crisis Resolution — Return Depositors Money', keywords: 'cooperative, depositor, savings, cooperative fraud, financial cooperative' },
  { id: 32, title: 'Double Tourist Numbers & Spending', keywords: 'tourism, tourist, Visit Nepal, tourist arrival, tourism revenue' },
  { id: 33, title: 'Official State Apology to Dalit Community', keywords: 'Dalit, caste discrimination, state apology, social justice, untouchability' },
  { id: 34, title: 'Social Security Expansion — Pension & Insurance', keywords: 'social security, pension, elderly allowance, insurance, social protection' },
  { id: 35, title: 'Fast-Track Citizenship & Passport Processing', keywords: 'citizenship, passport, MRP, identity document, citizenship by descent' },
];

// ─── Gemini API Call ────────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.1,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJSON<T>(text: string): T | null {
  try {
    // Strip markdown code fences (```json ... ```)
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ─── Classification ─────────────────────────────────────────────────

interface ClassResult {
  isRelevant: boolean;
  relevanceScore: number;
  matchedPromiseIds: number[];
  classification: string;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an intelligence analyst for Nepal Najar, tracking Nepal's government promises.
Analyze if this news signal is relevant to any of these 35 promises:

${PROMISES.map(p => `${p.id}: ${p.title} (${p.keywords})`).join('\n')}

Respond in JSON ONLY (no markdown, no backticks):
{
  "isRelevant": boolean,
  "relevanceScore": 0.0 to 1.0,
  "matchedPromiseIds": [list of matching promise IDs],
  "classification": "confirms" or "contradicts" or "neutral" or "budget_allocation" or "policy_change" or "statement",
  "reasoning": "brief explanation"
}

Rules:
- A signal is relevant if it provides evidence about ANY promise's progress, delay, or status
- relevanceScore 0.7+ means directly about a specific promise
- relevanceScore 0.3-0.7 means indirectly related (e.g. general budget news affecting specific projects)
- relevanceScore <0.3 means not really relevant
- matchedPromiseIds should list ALL promises this signal relates to
- "confirms" = evidence of progress, "contradicts" = evidence of delay/failure, "neutral" = informational`;

async function classifySignal(signal: { title: string; content: string | null; source_id: string; published_at: string | null; author: string | null }) {
  const userPrompt = `Title: ${signal.title}
Content: ${(signal.content || '').slice(0, 1500)}
Source: ${signal.source_id}
Date: ${signal.published_at || 'unknown'}`;

  const response = await callGemini(SYSTEM_PROMPT, userPrompt);
  return parseJSON<ClassResult>(response);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Nepal Najar AI Classification Engine      ║');
  console.log('║  Powered by Gemini Flash (free tier)       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Get unclassified signals
  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select('id, title, content, source_id, published_at, author')
    .eq('tier1_processed', false)
    .order('discovered_at', { ascending: false });

  if (error) {
    console.error('Error fetching signals:', error.message);
    process.exit(1);
  }

  if (!signals || signals.length === 0) {
    console.log('No unclassified signals found. Run setup-and-sweep.ts first.');
    return;
  }

  console.log(`📊 Found ${signals.length} unclassified signals\n`);
  console.log('Starting Tier 1 classification with Gemini Flash...\n');

  let classified = 0;
  let relevant = 0;
  let errors = 0;
  const promiseHits: Record<number, number> = {};

  for (const signal of signals) {
    const shortTitle = (signal.title || '').slice(0, 55);
    process.stdout.write(`  [${classified + 1}/${signals.length}] ${shortTitle.padEnd(55)} `);

    try {
      const result = await classifySignal(signal);

      if (!result) {
        console.log('⚠️  parse error');
        errors++;
        // Mark as processed to avoid retrying
        await supabase.from('intelligence_signals').update({ tier1_processed: true }).eq('id', signal.id);
        continue;
      }

      // Normalize result fields
      const score = typeof result.relevanceScore === 'number' ? result.relevanceScore : 0;
      const matchedIds = Array.isArray(result.matchedPromiseIds) ? result.matchedPromiseIds : [];
      const classification = result.classification || 'neutral';
      const reasoning = result.reasoning || '';

      // Update signal in database
      await supabase.from('intelligence_signals').update({
        tier1_processed: true,
        relevance_score: score,
        matched_promise_ids: matchedIds,
        classification,
        reasoning,
      }).eq('id', signal.id);

      if (result.isRelevant && score >= 0.3) {
        relevant++;
        console.log(`✅ ${score.toFixed(2)} → Promise ${matchedIds.join(',')} (${classification})`);
        for (const pid of matchedIds) {
          promiseHits[pid] = (promiseHits[pid] || 0) + 1;
        }
      } else {
        console.log(`○  not relevant (${score.toFixed(2)})`);
      }

      classified++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.log(`❌ ${msg.slice(0, 60)}`);
      errors++;

      // Rate limit — wait longer on errors
      if (msg.includes('429') || msg.includes('quota')) {
        console.log('  ⏳ Rate limited — waiting 30s...');
        await new Promise(r => setTimeout(r, 30_000));
      }
    }

    // Respect Gemini 2.5 Flash free tier rate limits (~5 RPM)
    await new Promise(r => setTimeout(r, 13_000));
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Classification Complete!`);
  console.log(`  📊 ${classified} signals classified`);
  console.log(`  ✨ ${relevant} found relevant to promises`);
  if (errors > 0) console.log(`  ⚠️  ${errors} errors`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (Object.keys(promiseHits).length > 0) {
    console.log('  Promises with evidence found:');
    const sorted = Object.entries(promiseHits).sort((a, b) => b[1] - a[1]);
    for (const [pid, count] of sorted) {
      const promise = PROMISES.find(p => p.id === Number(pid));
      console.log(`  📌 #${pid} ${(promise?.title || 'Unknown').slice(0, 45).padEnd(45)} ${count} signal${count > 1 ? 's' : ''}`);
    }
  }

  console.log('\n✅ Done! Signals are now classified. Check the app to see promise matches.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
