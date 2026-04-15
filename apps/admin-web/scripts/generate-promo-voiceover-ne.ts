/**
 * Generate per-scene Nepali voiceover for ServicesMarketingNE promo video.
 * Uses ne-NP-SagarNeural voice.
 *
 * Usage: npx tsx scripts/generate-promo-voiceover-ne.ts
 */

import { MsEdgeTTS } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.join(__dirname, '../public/audio/promo-ne');
const VOICE = 'ne-NP-SagarNeural';
const FPS = 30;

const segments = [
  {
    id: '01-hook',
    text: `सरकारी कार्यालयमा पूरा दिन बर्बाद गर्नुभएको छ? अब पर्दैन।`,
  },
  {
    id: '02-pain',
    text: `गलत कागजात। अन्तहीन लाइन। दलालले थप शुल्क लिने।`,
  },
  {
    id: '03-landing',
    text: `नेपाल रिपब्लिक भेट्नुहोस्। तपाईंलाई के चाहिन्छ भन्नुहोस्, नेपालीमा वा अंग्रेजीमा।`,
  },
  {
    id: '04-advisor',
    text: `मलाई पासपोर्ट चाहिन्छ। AI ले तपाईंको कागजात, शुल्क, र नजिकको कार्यालय देखाउँछ। एक ट्यापमा सुरु गर्नुहोस्।`,
  },
  {
    id: '05-formfill',
    text: `AI ले तपाईंको फारम भर्छ, निवेदन पेश गर्छ, र सही कार्यालयमा पठाउँछ।`,
  },
  {
    id: '06-tracking',
    text: `आफ्नो फोनबाट हरेक केस ट्र्याक गर्नुहोस्। चरणहरू, कागजातहरू, अपडेटहरू।`,
  },
  {
    id: '07-services',
    text: `नागरिकता, लाइसेन्स, अस्पताल, बिल, कर। हरेक सेवा, सरल बनाइएको।`,
  },
  {
    id: '08-proof',
    text: `७० भन्दा बढी सेवाहरू। पूर्ण रूपमा निःशुल्क।`,
  },
  {
    id: '09-cta',
    text: `नेपाल रिपब्लिक डट ओआरजी। अहिले नै प्रयोग गर्नुहोस्।`,
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

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ne-NP">
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
  console.log('Generating Nepali voiceover segments (SagarNeural)...\n');

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

  // Output Remotion audio sequences
  cursor = 0;
  console.log('\n--- REMOTION AUDIO SEQUENCES ---\n');
  for (const r of results) {
    console.log(`      <Sequence from={${cursor}} durationInFrames={${r.frames}}>`);
    console.log(`        <Audio src={staticFile('audio/promo-ne/${r.id}.mp3')} volume={1} />`);
    console.log(`      </Sequence>\n`);
    cursor += r.frames + PAD_FRAMES;
  }

  // Output scene visual sequences
  cursor = 0;
  console.log('\n--- REMOTION VISUAL SEQUENCES ---\n');
  const sceneNames = ['HookScene', 'PainScene', 'LandingScene', 'AdvisorDemoScene', 'FormFillScene', 'TrackingScene', 'ServicesBreadthScene', 'SocialProofScene', 'CTAScene'];
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
