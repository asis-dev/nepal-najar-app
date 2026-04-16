#!/usr/bin/env node
/**
 * Render Hype Reel — 15s viral video from today's top trending story
 *
 * Output: ~/Desktop/nepal-republic-videos/YYYY-MM-DD/
 *   hype-reel.mp4    (15s, 1080x1920, no audio — text-forward design)
 *   hype-reel-vo.mp4 (15s with voiceover merged)
 *
 * Usage:
 *   node scripts/render-hype-reel.js              # today
 *   node scripts/render-hype-reel.js 2026-04-16   # specific date
 *   node scripts/render-hype-reel.js --no-ai      # skip AI, use deterministic content
 */

const { execSync } = require('child_process');
const { readFileSync, mkdirSync, writeFileSync, existsSync, statSync, unlinkSync } = require('fs');
const { resolve, join } = require('path');

// ── Load env ─────────────────────────────────────────────────────────────
const ROOT = resolve(__dirname, '..');
const envPath = join(ROOT, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error('Could not load .env.local');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOV_START = new Date('2026-03-26T00:00:00+05:45');
const OUTPUT_BASE = resolve(process.env.HOME, 'Desktop/nepal-republic-videos');
const ENTRY = join(ROOT, 'remotion/index.ts');
const FFMPEG = `${process.env.HOME}/bin/ffmpeg`;

const args = process.argv.slice(2);
const skipAI = args.includes('--no-ai');
const promiseMode = args.includes('--promise');
const promiseId = args.find((a) => /^\d+$/.test(a) && parseInt(a) <= 200);
const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

function todayDate() {
  const now = new Date();
  const nepal = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  return nepal.toISOString().slice(0, 10);
}

function dayForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00+05:45');
  return Math.max(1, Math.floor((d.getTime() - GOV_START.getTime()) / 86400000) + 1);
}

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

// ── TTS ─────────────────────────────────────────────────────────────────
async function generateVoiceover(script, outputPath, voice) {
  console.log(`  Generating voiceover (${voice})...`);
  const { MsEdgeTTS } = require('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3');
  const { audioStream } = tts.toStream(script);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', (c) => chunks.push(c));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
  });
  const buf = Buffer.concat(chunks);
  if (buf.length < 1000) throw new Error(`TTS too small (${buf.length}B)`);
  writeFileSync(outputPath, buf);
  console.log(`  Voiceover: ${(buf.length / 1024).toFixed(0)} KB`);
}

// ── Remotion render ─────────────────────────────────────────────────────
function renderVideo(compositionId, propsPath, outputPath, frames = 450) {
  console.log(`  Rendering ${compositionId} (${frames} frames = ${frames / 30}s)...`);
  execSync(
    `npx remotion render "${ENTRY}" ${compositionId} "${outputPath}" --props="${propsPath}" --codec=h264 --crf=18 --log=error`,
    { cwd: ROOT, stdio: 'pipe', timeout: 300_000 },
  );
  if (!existsSync(outputPath)) throw new Error(`Render failed: ${outputPath} not found`);
  console.log(`  Rendered: ${(statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB`);
}

// ── Audio merge ─────────────────────────────────────────────────────────
function mergeAudio(videoPath, audioPath, outputPath) {
  if (!existsSync(audioPath)) throw new Error(`Audio missing: ${audioPath}`);
  if (!existsSync(videoPath)) throw new Error(`Video missing: ${videoPath}`);
  console.log(`  Merging audio...`);
  execSync(
    `"${FFMPEG}" -y -i "${videoPath}" -i "${audioPath}" ` +
      `-filter_complex "[1:a]apad=whole_dur=15[aout]" ` +
      `-map 0:v -map "[aout]" -c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k ` +
      `-t 15 -movflags +faststart "${outputPath}"`,
    { cwd: ROOT, stdio: 'pipe', timeout: 60_000 },
  );
  if (!existsSync(outputPath)) throw new Error(`Merge failed`);
  console.log(`  Merged: ${(statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB`);
}

// ── AI Content Generation ───────────────────────────────────────────────
async function generateHypeContentWithAI(story, brief, day) {
  // Use Groq for speed (or OpenAI fallback)
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const isGroq = !!process.env.GROQ_API_KEY;
  const baseUrl = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

  const prompt = `You are a viral Nepali news video creator. Create HYPE content for a 15-second video reel.

STORY:
Title: ${story.title}
Title (Nepali): ${story.titleNe || 'N/A'}
Summary: ${story.summary || 'N/A'}
Sentiment: ${story.sentiment}
Sources: ${story.signalCount} sources

CONTEXT: Day ${day} of new government. Date: ${brief.date}. ${brief.stats?.newSignals || 0} signals today.

RULES:
1. Hook must stop scrolling in 1 SECOND - shocking, surprising, outrage.
2. Natural Nepali (Devanagari) - young Nepali tone, NOT bureaucratic.
3. Facts: pick most surprising numbers/claims.
4. Question: divisive, FORCES comments.
5. Keep SHORT. 15 seconds. Every word earns its place.

RESPOND IN EXACT JSON:
{"hookNe":"Nepali headline max 15 words Devanagari","hookEn":"English headline max 12 words","hookEmoji":"single emoji","facts":[{"textNe":"Nepali fact max 12 words","textEn":"English fact","highlight":"key number BIG"},{"textNe":"Nepali fact 2","textEn":"English fact 2","highlight":"number"}],"questionNe":"Provocative Nepali question max 15 words Devanagari","questionEn":"English question","category":"breaking|scandal|progress|failure|milestone"}

ONLY valid JSON. No markdown.`;

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`AI API ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned no JSON');
  return JSON.parse(jsonMatch[0]);
}

function generateFallbackContent(story, brief, day) {
  const hookNe = story.titleNe || story.title;
  const hookEn = story.title;
  const emoji =
    story.sentiment === 'negative'
      ? '\u{1F6A8}'
      : story.sentiment === 'positive'
        ? '\u26A1'
        : '\u{1F534}';

  return {
    hookNe,
    hookEn,
    hookEmoji: emoji,
    facts: [
      {
        textNe: `${story.signalCount} \u0938\u094D\u0930\u094B\u0924\u0932\u0947 \u092F\u094B \u0915\u0941\u0930\u093E \u092A\u0941\u0937\u094D\u091F\u093F \u0917\u0930\u0947\u0915\u093E \u091B\u0928\u094D`,
        textEn: `${story.signalCount} sources confirmed this story`,
        highlight: `${story.signalCount}`,
      },
      {
        textNe: `\u0906\u091C ${brief.stats?.newSignals || 0} \u0928\u092F\u093E\u0901 \u0938\u0902\u0915\u0947\u0924 \u092D\u0947\u091F\u093F\u092F\u094B`,
        textEn: `${brief.stats?.newSignals || 0} new signals detected today`,
        highlight: `${brief.stats?.newSignals || 0}`,
      },
    ],
    questionNe:
      '\u0924\u092A\u093E\u0908\u0902\u0915\u094B \u0935\u093F\u091A\u093E\u0930 \u0915\u0947 \u091B? \u0915\u092E\u0947\u0928\u094D\u091F\u092E\u093E \u092D\u0928\u094D\u0928\u0941\u0939\u094B\u0938\u094D!',
    questionEn: 'What do you think? Tell us in the comments!',
    category: story.sentiment === 'negative' ? 'failure' : 'breaking',
  };
}

// ── Rank stories by viral potential ─────────────────────────────────────
function pickBestStory(stories) {
  return stories
    .map((s) => {
      let score = 0;
      if (s.sentiment === 'negative') score += 40;
      if (s.sentiment === 'mixed') score += 25;
      score += Math.min(30, (s.signalCount || 0) * 6);
      score += ((s.importance || 50) / 100) * 30;
      if ((s.relatedCommitments || []).length > 0) score += 20;
      return { story: s, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.story;
}

// ── Promise vs Reality — the format that actually gets shared ────────
async function pickBestPromise(promises) {
  const day = dayForDate(todayDate());
  const totalDays = 100; // 100-day plan benchmark

  // Score each promise for shareability
  return promises
    .map((p) => {
      let shareScore = 0;
      const progress = p.progress || 0;
      const status = p.status || 'not_started';

      // Stalled = outrage = shares
      if (status === 'stalled') shareScore += 50;
      // 0% progress = "nothing happened" = shocking
      if (progress === 0) shareScore += 40;
      // Low progress on important topics
      if (progress < 20 && progress > 0) shareScore += 20;

      // Topics that affect daily life score higher
      const dailyLife = [
        'economy', 'transport', 'health', 'education', 'energy', 'infrastructure',
      ];
      if (dailyLife.includes((p.category || '').toLowerCase())) shareScore += 30;

      // Specific promises that are universally relatable
      const title = (p.title || '').toLowerCase();
      if (title.includes('job') || title.includes('employment') || title.includes('रोजगार'))
        shareScore += 40;
      if (title.includes('100 days') || title.includes('१०० दिन'))
        shareScore += 60; // HAS A DEADLINE = perfect accountability
      if (title.includes('gdp') || title.includes('growth'))
        shareScore += 20;
      if (title.includes('metro') || title.includes('highway') || title.includes('road'))
        shareScore += 25;
      if (title.includes('electric') || title.includes('bus'))
        shareScore += 25;
      if (title.includes('corruption') || title.includes('भ्रष्टाचार'))
        shareScore += 30;
      if (title.includes('digital') || title.includes('technology'))
        shareScore += 15;

      // Math-based drama: at current rate, will they finish?
      const projectedCompletion =
        progress > 0 ? Math.round((day / progress) * 100) : 9999;
      const willFinish = projectedCompletion <= 1825; // 5 years
      if (!willFinish && progress > 0) shareScore += 30; // won't finish = drama

      return { promise: p, shareScore, projectedCompletion, willFinish };
    })
    .sort((a, b) => b.shareScore - a.shareScore);
}

function buildPromiseVsRealityData(promise, day) {
  const p = promise.promise;
  const progress = p.progress || 0;
  const status = p.status || 'not_started';

  // Calculate dramatic stats
  const daysPerPercent = progress > 0 ? Math.round(day / progress) : null;
  const projectedDays = daysPerPercent ? daysPerPercent * 100 : null;
  const projectedYears = projectedDays ? (projectedDays / 365).toFixed(1) : null;

  // Status in Nepali
  const statusNe =
    status === 'stalled'
      ? 'रोकिएको'
      : status === 'not_started'
        ? 'सुरु भएको छैन'
        : status === 'in_progress'
          ? 'प्रगतिमा'
          : 'पूरा';

  const title = (p.title || '').toLowerCase();
  const is100Days = title.includes('100 days') || title.includes('१०० दिन');

  // Build hook — THE thing that stops the scroll
  let hookNe, hookEn;
  if (is100Days) {
    hookNe = `१०० दिनमा १०० काम भन्नुभयो — दिन ${day}: ${progress}% मात्र`;
    hookEn = `Promised 100 works in 100 days — Day ${day}: only ${progress}%`;
  } else if (progress === 0) {
    hookNe = `"${p.title_ne}" — दिन ${day} पनि शून्य प्रगति`;
    hookEn = `"${p.title}" — Day ${day}, still ZERO progress`;
  } else {
    hookNe = `"${p.title_ne}" — ${progress}% मात्र`;
    hookEn = `"${p.title}" — only ${progress}% done`;
  }

  // Build facts
  const facts = [];

  // Fact 1: The promise itself
  facts.push({
    textNe: `वाचा: "${p.title_ne}"`,
    textEn: `Promise: "${p.title}"`,
    highlight: status === 'stalled' ? statusNe : `${progress}%`,
  });

  // Fact 2: The math
  if (is100Days) {
    const remaining = 100 - day;
    const workLeft = 100 - progress;
    facts.push({
      textNe: `${remaining} दिन बाँकी, ${workLeft}% काम बाँकी`,
      textEn: `${remaining} days left, ${workLeft}% work remaining`,
      highlight: `${remaining} दिन`,
    });
  } else if (projectedYears && parseFloat(projectedYears) > 5) {
    facts.push({
      textNe: `यो गतिमा पूरा हुन ${projectedYears} वर्ष लाग्छ`,
      textEn: `At this rate, it'll take ${projectedYears} YEARS`,
      highlight: `${projectedYears} वर्ष`,
    });
  } else if (progress === 0) {
    facts.push({
      textNe: `${day} दिन बित्यो — कुनै काम भएन`,
      textEn: `${day} days passed — nothing done`,
      highlight: `${day} दिन`,
    });
  } else {
    facts.push({
      textNe: `दिन ${day} मा ${progress}% प्रगति`,
      textEn: `${progress}% progress in ${day} days`,
      highlight: `${progress}%`,
    });
  }

  // Fact 3: Grade
  const avgProgress = progress;
  const grade =
    avgProgress >= 80
      ? 'A'
      : avgProgress >= 60
        ? 'B'
        : avgProgress >= 40
          ? 'C'
          : avgProgress >= 20
            ? 'D'
            : 'F';

  facts.push({
    textNe: `नेपाल रिपब्लिक ग्रेड`,
    textEn: `Nepal Republic Grade`,
    highlight: grade,
  });

  // Build question — divisive, forces comments
  let questionNe, questionEn;
  if (is100Days) {
    questionNe = '१०० दिनमा पूरा हुन्छ कि हुँदैन? भन्नुहोस्!';
    questionEn = 'Will they finish in 100 days? YES or NO?';
  } else if (progress === 0) {
    questionNe = 'किन सुरु भएन? कसको गल्ती हो?';
    questionEn = "Why hasn't it started? Whose fault is it?";
  } else {
    questionNe = 'यो गति पर्याप्त छ कि छैन?';
    questionEn = 'Is this pace enough? YES or NO?';
  }

  const category =
    status === 'stalled' || progress === 0
      ? 'failure'
      : progress < 20
        ? 'scandal'
        : 'breaking';

  return {
    date: todayDate(),
    dayNumber: day,
    hook: {
      textNe: hookNe,
      textEn: hookEn,
      emoji: progress === 0 || status === 'stalled' ? '\u{1F6A8}' : '\u{1F4CA}',
      faceImage: 'images/politicians/balen-shah.jpg',
      faceName: 'PM Balen Shah',
      faceNameNe: '\u092A\u094D\u0930\u092E \u092C\u093E\u0932\u0947\u0928 \u0936\u093E\u0939',
      faceRole: '\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0928\u094D\u0924\u094D\u0930\u0940',
    },
    facts,
    grade,
    gradeChange: progress === 0 ? 'down' : undefined,
    previousGrade: undefined,
    questionNe,
    questionEn,
    category,
  };
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const date = dateArg || todayDate();
  const day = dayForDate(date);
  const outDir = join(OUTPUT_BASE, date);
  mkdirSync(outDir, { recursive: true });

  console.log(`\n\u{1F525} HYPE REEL for ${date} (Day ${day})\n`);

  // ── Fetch brief ──
  let briefs = await supabaseGet('daily_briefs', `date=eq.${date}&select=*`);
  if (!briefs.length) {
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
    briefs = await supabaseGet('daily_briefs', `date=eq.${yesterday}&select=*`);
    if (briefs.length) console.log(`  Using brief from ${yesterday}`);
    else {
      console.error(`No brief found for ${date}`);
      process.exit(1);
    }
  }
  const brief = briefs[0];
  const stories = brief.top_stories || [];

  // ── Fetch promises for Promise vs Reality mode ──
  const promises = await supabaseGet(
    'promises',
    'select=id,title,title_ne,status,progress,category,description_ne&order=id.asc&limit=109',
  );

  let hypeData;

  if (promiseMode || promiseId || stories.length === 0) {
    // ═══ PROMISE VS REALITY MODE — the format that gets shared ═══
    console.log('  \u{1F4CA} PROMISE VS REALITY mode\n');

    let chosenPromise;
    if (promiseId) {
      // Specific promise requested
      const p = promises.find((pr) => String(pr.id) === promiseId);
      if (!p) {
        console.error(`Promise ID ${promiseId} not found`);
        process.exit(1);
      }
      chosenPromise = { promise: p, shareScore: 100, projectedCompletion: 0, willFinish: false };
      console.log(`  \u{1F3AF} Using promise #${promiseId}: "${p.title}"\n`);
    } else {
      // Auto-pick most shareable promise
      const ranked = await pickBestPromise(promises);
      chosenPromise = ranked[0];
      console.log(`  \u{1F3AF} Best promise: "${chosenPromise.promise.title}"`);
      console.log(`     Status: ${chosenPromise.promise.status}, Progress: ${chosenPromise.promise.progress}%`);
      console.log(`     Share score: ${chosenPromise.shareScore}\n`);
    }

    hypeData = buildPromiseVsRealityData(chosenPromise, day);
  } else {
    // ═══ TRENDING NEWS MODE — from daily brief ═══
    const chosenStory = pickBestStory(stories);
    console.log(`  \u{1F3AF} Picked story: "${chosenStory.title}"`);
    console.log(`     Sentiment: ${chosenStory.sentiment}, Sources: ${chosenStory.signalCount}\n`);

    let hypeContent;
    if (skipAI) {
      console.log('  Using fallback content (--no-ai)\n');
      hypeContent = generateFallbackContent(chosenStory, brief, day);
    } else {
      try {
        console.log('  Generating AI hype content...');
        hypeContent = await generateHypeContentWithAI(chosenStory, brief, day);
        console.log(`  \u2705 AI content generated\n`);
      } catch (err) {
        console.warn(`  \u26A0\uFE0F AI failed (${err.message}), using fallback\n`);
        hypeContent = generateFallbackContent(chosenStory, brief, day);
      }
    }

    // Compute overall grade
    const totalProgress = promises.reduce((sum, p) => sum + (p.progress || 0), 0);
    const avgProgress = totalProgress / Math.max(1, promises.length);
    const grade = avgProgress >= 80 ? 'A' : avgProgress >= 60 ? 'B' : avgProgress >= 40 ? 'C' : avgProgress >= 20 ? 'D' : 'F';

    hypeData = {
      date,
      dayNumber: day,
      hook: {
        textNe: hypeContent.hookNe,
        textEn: hypeContent.hookEn,
        emoji: hypeContent.hookEmoji,
        faceImage: 'images/politicians/balen-shah.jpg',
        faceName: 'PM Balen Shah',
        faceNameNe: '\u092A\u094D\u0930\u092E \u092C\u093E\u0932\u0947\u0928 \u0936\u093E\u0939',
        faceRole: '\u092A\u094D\u0930\u0927\u093E\u0928\u092E\u0928\u094D\u0924\u094D\u0930\u0940',
      },
      facts: (hypeContent.facts || []).slice(0, 3),
      grade,
      gradeChange: undefined,
      previousGrade: undefined,
      questionNe: hypeContent.questionNe,
      questionEn: hypeContent.questionEn,
      category: hypeContent.category || 'breaking',
    };
  }

  const propsPath = join(outDir, 'hype-props.json');
  writeFileSync(propsPath, JSON.stringify({ data: hypeData }));

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Render the 15s video
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\u{1F3AC} Step 1: Rendering HypeReel (15s)...\n');
  const rawPath = join(outDir, 'hype-raw.mp4');
  renderVideo('HypeReel', propsPath, rawPath, 450);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Generate voiceover (short 10s script)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n\u{1F399}\uFE0F Step 2: Generating voiceover...\n');

  const voScript = [
    `${hypeData.hook.textNe}\u0964`,
    hypeData.facts[0]?.textNe ? `${hypeData.facts[0].textNe}\u0964` : '',
    hypeData.facts[1]?.textNe ? `${hypeData.facts[1].textNe}\u0964` : '',
    `${hypeData.questionNe}`,
  ]
    .filter(Boolean)
    .join(' ');

  const voPath = join(outDir, 'hype-vo.mp3');
  await generateVoiceover(voScript, voPath, 'ne-NP-SagarNeural');

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Merge audio
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n\u{1F50A} Step 3: Merging audio...\n');
  const finalPath = join(outDir, 'hype-reel.mp4');
  mergeAudio(rawPath, voPath, finalPath);

  // Also keep the no-audio version (for platforms where text works better)
  const silentPath = join(outDir, 'hype-reel-silent.mp4');
  require('fs').copyFileSync(rawPath, silentPath);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Cleanup
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n\u{1F9F9} Cleaning up...');
  try {
    unlinkSync(propsPath);
  } catch {}
  try {
    unlinkSync(rawPath);
  } catch {}
  try {
    unlinkSync(voPath);
  } catch {}

  const finalSize = (statSync(finalPath).size / 1024 / 1024).toFixed(1);
  const silentSize = (statSync(silentPath).size / 1024 / 1024).toFixed(1);

  console.log(`\n\u{1F525}\u{1F525} HYPE REEL READY! \u{1F525}\u{1F525}`);
  console.log(`\u{1F4C1} ${outDir}/`);
  console.log(`   hype-reel.mp4        \u2014 15s with voiceover (${finalSize} MB)`);
  console.log(`   hype-reel-silent.mp4 \u2014 15s silent/text-only (${silentSize} MB)`);
  console.log(`\n\u{1F680} Post to Facebook Reels / TikTok / YouTube Shorts!\n`);
  console.log(`HOOK: ${hypeData.hook.textEn}`);
  console.log(`QUESTION: ${hypeData.questionEn}\n`);

  // Print suggested caption for social media
  console.log('\u{1F4DD} Suggested caption:');
  console.log('---');
  console.log(`${hypeData.hook.emoji} ${hypeData.hook.textNe}`);
  console.log('');
  console.log(`\u{1F4CA} Day ${day} \u2022 Nepal Republic`);
  console.log('');
  console.log(`\u{1F4AC} ${hypeData.questionNe}`);
  console.log('');
  console.log('#Nepal #NepalRepublic #BalenShah #\u0928\u0947\u092A\u093E\u0932 #\u0938\u0930\u0915\u093E\u0930');
  console.log('---\n');
}

main().catch((err) => {
  console.error('\u274C FATAL:', err.message);
  process.exit(1);
});
