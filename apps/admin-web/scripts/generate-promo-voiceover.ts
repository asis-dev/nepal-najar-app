/**
 * Generate voiceover audio segments for the ServicesMarketing promo video.
 * Uses Edge TTS (same as the app's /api/tts route).
 *
 * Usage: npx tsx scripts/generate-promo-voiceover.ts
 */

import { MsEdgeTTS } from 'msedge-tts';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../public/audio/promo');

// Scene narration segments — timed to match the Remotion composition
const segments = [
  {
    id: '01-hook',
    voice: 'en-US-AndrewNeural', // deeper male voice for dramatic hook
    text: 'Introducing Nepal\'s first AI-powered service advisor. Passport. License. Hospital. All in one place.',
  },
  {
    id: '02-pain',
    voice: 'en-US-AriaNeural',
    text: 'Hours in queues at government offices. Wrong documents? Come back tomorrow. Brokers charging hidden fees. Sound familiar?',
  },
  {
    id: '03-landing',
    voice: 'en-US-AriaNeural',
    text: 'Nepal Republic is your AI-powered citizen platform. Just tell it what you need — in English, Nepali, or even voice.',
  },
  {
    id: '04-advisor',
    voice: 'en-US-AriaNeural',
    text: 'Say "I need to renew my passport" and the AI advisor instantly shows you every document you need, the fees, timeline, and nearest office. Then start your case with one tap.',
  },
  {
    id: '05-tracking',
    voice: 'en-US-AriaNeural',
    text: 'Track every case in one place. See your progress, next steps, and documents — all at a glance. No more guessing.',
  },
  {
    id: '06-services',
    voice: 'en-US-AriaNeural',
    text: 'From passports to hospital appointments, driving licenses to electricity bills — every government service, mapped and simplified.',
  },
  {
    id: '07-proof',
    voice: 'en-US-AriaNeural',
    text: 'Over 70 government services. 10 categories. An AI advisor available 24 7. And it\'s completely free.',
  },
  {
    id: '08-cta',
    voice: 'en-US-AndrewNeural',
    text: 'Your government services, simplified. Visit nepal republic dot org today.',
  },
  // Nepali version of the hook for bilingual impact
  {
    id: '09-hook-ne',
    voice: 'ne-NP-HemkalaNeural',
    text: 'नेपाल रिपब्लिक। तपाईंको सरकारी सेवा, सरल बनाइयो।',
  },
];

async function generateSegment(segment: typeof segments[0]) {
  console.log(`Generating: ${segment.id} (${segment.voice})...`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(segment.voice, 'audio-24khz-48kbitrate-mono-mp3' as any);

  const { audioStream } = tts.toStream(segment.text);

  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }

  const outputPath = path.join(OUTPUT_DIR, `${segment.id}.mp3`);
  fs.writeFileSync(outputPath, Buffer.concat(chunks));
  console.log(`  -> ${outputPath} (${(Buffer.concat(chunks).length / 1024).toFixed(0)} KB)`);
}

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const segment of segments) {
    try {
      await generateSegment(segment);
    } catch (err) {
      console.error(`Failed to generate ${segment.id}:`, err);
    }
  }

  console.log('\nDone! Audio files saved to:', OUTPUT_DIR);
  console.log('Now update ServicesMarketing.tsx to import these with <Audio> components.');
}

main();
