/**
 * Generate voiceover for ServicesMarketing promo video.
 * Marketing-oriented script with strong hook, matched to video scenes.
 *
 * Usage: npx tsx scripts/generate-promo-voiceover.ts
 */

import { MsEdgeTTS } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../public/audio/promo');
const VOICE = 'en-US-AvaNeural'; // Microsoft's most natural female voice
const NEPALI = 'ne-NP-HemkalaNeural';

/*
  VIDEO TIMELINE:
  0-3s   (0-90)      Hook
  3-7s   (90-210)    Pain
  7-14s  (210-420)   Landing page
  14-22s (420-660)   AI advisor demo
  22-30s (660-900)   Case tracking
  30-38s (900-1140)  Services breadth
  38-44s (1140-1320) Social proof
  44-50s (1320-1500) CTA
*/
const segments = [
  {
    id: '01-hook',
    voice: VOICE,
    rate: 0.92,
    // 0-3s: STRONG HOOK — stop the scroll
    text: `Stop. If you've ever wasted a full day at a sarkari office in Nepal, this is for you.`,
  },
  {
    id: '02-pain',
    voice: VOICE,
    rate: 1.0,
    // 3-7s: PAIN — make it relatable
    text: `The wrong documents. The endless lines. The "come back tomorrow." And paying a broker for something that should be free. We've all been there.`,
  },
  {
    id: '03-landing',
    voice: VOICE,
    rate: 0.95,
    // 7-14s: INTRO — show the solution
    text: `Now there's Nepal Republic. An AI-powered app that handles your government services for you. Just open it and say what you need.`,
  },
  {
    id: '04-advisor',
    voice: VOICE,
    rate: 0.93,
    // 14-22s: DEMO — show it working
    text: `Watch this. "I need to renew my passport." Instantly, the AI shows you every document, the fees, the timeline, and the nearest office. One tap, and your case is started.`,
  },
  {
    id: '05-tracking',
    voice: VOICE,
    rate: 0.95,
    // 22-30s: TRACKING — show progress
    text: `Then track everything from your phone. Every step, every document, every update, right here. No more wondering where your application is.`,
  },
  {
    id: '06-services',
    voice: VOICE,
    rate: 0.95,
    // 30-38s: BREADTH — show scale
    text: `And it's not just passports. Citizenship, driving license, hospital appointments, electricity bills, taxes, land registration. Every government service Nepal has. Simplified.`,
  },
  {
    id: '07-proof',
    voice: VOICE,
    rate: 0.95,
    // 38-44s: PROOF — build trust
    text: `Over 70 services. Available 24 7. Works in English and Nepali. And completely free.`,
  },
  {
    id: '08-cta',
    voice: VOICE,
    rate: 0.88,
    // 44-50s: CTA — drive action
    text: `Stop wasting days. Visit nepal republic dot org right now. It takes two minutes.`,
  },
  {
    id: '09-cta-ne',
    voice: NEPALI,
    rate: 0.88,
    // Plays right after English CTA
    text: `नेपाल रिपब्लिक डट ओ आर जी मा जानुहोस्। निःशुल्क छ।`,
  },
];

async function generateSegment(seg: typeof segments[0]) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(seg.voice, 'audio-24khz-96kbitrate-mono-mp3' as any);

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${seg.voice}">
    <prosody rate="${seg.rate}" pitch="+0Hz">
      ${seg.text}
    </prosody>
  </voice>
</speak>`;

  process.stdout.write(`  ${seg.id}...`);

  try {
    const { audioStream } = tts.rawToStream(ssml);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${seg.id}.mp3`), buf);
    console.log(` ${(buf.length / 1024).toFixed(0)} KB`);
  } catch {
    // Fallback to plain text
    const { audioStream } = tts.toStream(seg.text);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${seg.id}.mp3`), buf);
    console.log(` ${(buf.length / 1024).toFixed(0)} KB [fallback]`);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('Generating marketing voiceover...\n');
  for (const seg of segments) {
    await generateSegment(seg);
  }
  console.log('\nDone:', OUTPUT_DIR);
}

main().catch(console.error);
