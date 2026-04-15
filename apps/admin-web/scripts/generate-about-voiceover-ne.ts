/**
 * Generate per-scene Nepali voiceover for AboutApp video.
 * Uses ne-NP-SagarNeural voice.
 *
 * Usage: npx tsx scripts/generate-about-voiceover-ne.ts
 */

import { MsEdgeTTS } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OUTPUT_DIR = path.join(__dirname, '../public/audio/about-video-ne');
const VOICE = 'ne-NP-SagarNeural';
const FPS = 30;

const segments = [
  {
    id: '01-intro',
    text: `नेपाल रिपब्लिकमा स्वागत छ — नेपालका नागरिकका लागि AI-संचालित प्लेटफर्म।`,
  },
  {
    id: '02-bridge',
    text: `नेपाल रिपब्लिक तपाईं र नेपालको सरकारबीच बस्छ। तपाईंले आफ्नो आवश्यकता सरल भाषामा वा आवाजमा भन्नुहोस्, AI ले बाँकी सबै सम्हाल्छ।`,
  },
  {
    id: '03-formfill',
    text: `पहिलो, AI ले तपाईंको फारम भर्छ। पासपोर्ट, ड्राइभिङ लाइसेन्स, जग्गा दर्ता, वा अस्पताल रेफरल — जे चाहिन्छ भन्नुहोस्। AI ले ९५ भन्दा बढी सरकारी सेवाहरूबाट सही सेवा पहिचान गर्छ र सबै आवश्यक फारम भर्छ।`,
  },
  {
    id: '04-routing',
    text: `दोस्रो, तपाईंको केस सही डेस्कमा पठाइन्छ। नेपाल रिपब्लिकले ५८ सरकारी निकायहरू जोडेको छ — मन्त्रालय, विभाग, नगरपालिका, अस्पताल, अदालत, र विश्वविद्यालय — ८७ सक्रिय मार्गहरूसहित।`,
  },
  {
    id: '05-deadlines',
    text: `तेस्रो, हरेक मार्गमा समयसीमा हुन्छ। एम्बुलेन्सको लागि एक घण्टादेखि ट्रेडमार्क दर्ताको लागि ९० दिनसम्म। प्रणालीले यी समयसीमाहरू ट्र्याक गर्छ र निकायले बेवास्ता गर्दा माथि पठाउँछ।`,
  },
  {
    id: '06-govreply',
    text: `चौथो, सरकारले सिधै जवाफ दिन सक्छ। निकायहरूले सुरक्षित लिङ्कबाट जवाफ दिन्छन्। स्वीकृत, अस्वीकृत, स्थिति अपडेट, वा थप जानकारी माग गर्न सक्छन्। हरेक जवाफ रेकर्ड हुन्छ।`,
  },
  {
    id: '07-intel',
    text: `बुद्धिमत्ता इन्जिन दिनमा दुई पटक चल्छ, नेपालभरका ८० भन्दा बढी समाचार स्रोत, १७ YouTube च्यानल, र सोसल मिडिया स्क्यान गर्दै। यसले अंग्रेजी र नेपाली दुवैमा अडियोसहित दैनिक ब्रिफ उत्पादन गर्छ।`,
  },
  {
    id: '08-promises',
    text: `१०९ सरकारी वचनहरूलाई A देखि F सम्म ग्रेड दिइन्छ। हरेक वचनमा प्रगति डेटा, प्रमाण, र स्रोत लिङ्कहरू छन्।`,
  },
  {
    id: '09-accountability',
    text: `रिपोर्ट कार्ड, मन्त्री स्कोरकार्ड, मन्त्रालय प्रदर्शन, साप्ताहिक सारांश, र खोज्न मिल्ने वाचलिस्ट — सबै सक्रिय र निरन्तर अपडेट हुन्छन्।`,
  },
  {
    id: '10-beta',
    text: `सेवा सञ्चालन पक्ष — AI फारम भर्ने, सरकारी डेस्कमा केस राउटिङ, र समयसीमा लागू — हाल बिटामा छ। यी सुविधाहरू सक्रिय छन् र हरेक दिन बढ्दैछन्।`,
  },
  {
    id: '11-cta',
    text: `नेपाल रिपब्लिक। तपाईं र तपाईंको सरकारबीचको AI। नेपाल रिपब्लिक डट ओआरजी।`,
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
  console.log('Generating Nepali About App voiceover (SagarNeural)...\n');

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
    console.log(`        <Audio src={staticFile('audio/about-video-ne/${r.id}.mp3')} volume={1} />`);
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
