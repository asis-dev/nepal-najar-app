/**
 * Generate per-scene voiceover for AboutApp video.
 * Uses en-US-AvaNeural voice.
 *
 * Usage: npx tsx scripts/generate-about-voiceover.ts
 */

import { MsEdgeTTS } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.join(__dirname, '../public/audio/about-video');
const VOICE = 'en-US-AvaNeural';
const FPS = 30;

const segments = [
  {
    id: '01-intro',
    text: `Welcome to Nepal Republic — an AI-powered citizen platform for Nepal.`,
  },
  {
    id: '02-bridge',
    text: `Nepal Republic stands between you and Nepal's government. You describe what you need in plain language or voice, and AI handles the rest.`,
  },
  {
    id: '03-formfill',
    text: `First, AI fills your forms. Whether it is a passport application, a driving license, land registration, or a hospital referral — you tell us what you need. AI identifies the right service from over 95 government services and fills out all the required forms for you.`,
  },
  {
    id: '04-routing',
    text: `Second, your case gets routed to the right desk. Nepal Republic has mapped 58 government authorities — ministries, departments, municipalities, hospitals, courts, and universities — with 87 active routes.`,
  },
  {
    id: '05-deadlines',
    text: `Third, every route has a deadline. From 1 hour for ambulance dispatch to 90 days for trademark registration. The system tracks these deadlines and escalates when authorities miss them.`,
  },
  {
    id: '06-govreply',
    text: `Fourth, government can respond directly. Authorities receive secure reply links. They can approve, reject, update status, or request more information. Every response is logged.`,
  },
  {
    id: '07-intel',
    text: `The intelligence engine runs twice daily, scanning over 80 news sources, 17 YouTube channels, and social media across Nepal. It produces a daily intelligence brief with audio in both English and Nepali.`,
  },
  {
    id: '08-promises',
    text: `109 government promises are tracked and scored with letter grades from A to F. Every commitment has progress data, evidence, and linked sources.`,
  },
  {
    id: '09-accountability',
    text: `Report cards, minister scorecards, ministry performance, weekly summaries, and a searchable watchlist — all live and updated continuously.`,
  },
  {
    id: '10-beta',
    text: `The service operations side — AI form filling, case routing, and SLA enforcement — is currently in beta. These features are live and growing every day.`,
  },
  {
    id: '11-cta',
    text: `Nepal Republic. AI between you and your government. nepal republic dot org.`,
  },
];

function getAudioDurationSec(filePath: string): number {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    return parseFloat(out);
  } catch {
    const size = fs.statSync(filePath).size;
    return size / 12000;
  }
}

async function generate(seg: typeof segments[0]) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, 'audio-24khz-96kbitrate-mono-mp3' as any);

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${VOICE}">
    <prosody rate="0.95" pitch="+0Hz">
      ${seg.text}
    </prosody>
  </voice>
</speak>`;

  const outputPath = path.join(OUTPUT_DIR, `${seg.id}.mp3`);

  try {
    const { audioStream } = tts.rawToStream(ssml);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) chunks.push(Buffer.from(chunk));
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
  } catch {
    const { audioStream } = tts.toStream(seg.text);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) chunks.push(Buffer.from(chunk));
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
  }

  const dur = getAudioDurationSec(outputPath);
  const frames = Math.ceil(dur * FPS);
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`  ${seg.id}: ${dur.toFixed(1)}s (${frames} frames) — ${sizeKB}KB`);
  return { id: seg.id, duration: dur, frames };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('Generating About App voiceover segments...\n');

  const results = [];
  for (const seg of segments) {
    results.push(await generate(seg));
  }

  const PAD_FRAMES = 30;
  let cursor = 0;
  console.log('\n--- SCENE TIMELINE ---\n');
  for (const r of results) {
    const sceneFrames = r.frames + PAD_FRAMES;
    console.log(`Scene ${r.id}: from=${cursor}, audio=${r.frames}f, scene=${sceneFrames}f (${(sceneFrames / FPS).toFixed(1)}s)`);
    cursor += sceneFrames;
  }
  console.log(`\nTotal: ${cursor} frames = ${(cursor / FPS).toFixed(1)}s`);

  cursor = 0;
  console.log('\n--- REMOTION AUDIO SEQUENCES ---\n');
  for (const r of results) {
    console.log(`      <Sequence from={${cursor}} durationInFrames={${r.frames}}>`);
    console.log(`        <Audio src={staticFile('audio/about-video/${r.id}.mp3')} volume={1} />`);
    console.log(`      </Sequence>\n`);
    cursor += r.frames + PAD_FRAMES;
  }

  cursor = 0;
  console.log('\n--- REMOTION VISUAL SEQUENCES ---\n');
  const sceneNames = ['IntroScene', 'BridgeScene', 'FormFillScene', 'RoutingScene', 'DeadlineScene', 'GovReplyScene', 'IntelScene', 'PromiseScene', 'AccountabilityScene', 'BetaScene', 'CTAScene'];
  for (let i = 0; i < results.length; i++) {
    const sceneFrames = results[i].frames + PAD_FRAMES;
    console.log(`      <Sequence from={${cursor}} durationInFrames={${sceneFrames}}>`);
    console.log(`        <${sceneNames[i]} />`);
    console.log(`      </Sequence>\n`);
    cursor += sceneFrames;
  }
  console.log(`\nTotal video: ${cursor} frames = ${(cursor / FPS).toFixed(1)}s`);
}

main().catch(console.error);
