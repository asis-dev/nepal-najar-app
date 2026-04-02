/**
 * Generate "About this app" audio MP3 files from canonical script text.
 *
 * Usage:
 *   npx tsx scripts/generate-about-audio.ts
 *
 * Output:
 *   public/audio/about-en.mp3  (en-US-AriaNeural)
 *   public/audio/about-ne.mp3  (ne-NP-SagarNeural)
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MsEdgeTTS } from 'msedge-tts';
import { ABOUT_AUDIO_SCRIPT } from '../lib/content/about-audio-script';

async function synthesizeMp3(
  text: string,
  voice: string,
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3' as any);

  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];

  return await new Promise((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

async function main() {
  const enVoice = 'en-US-AriaNeural';
  const neVoice = 'ne-NP-SagarNeural';

  console.log('[about-audio] Generating English narration...');
  const enAudio = await synthesizeMp3(ABOUT_AUDIO_SCRIPT.en, enVoice);

  console.log('[about-audio] Generating Nepali narration...');
  const neAudio = await synthesizeMp3(ABOUT_AUDIO_SCRIPT.ne, neVoice);

  const enPath = join(process.cwd(), 'public', 'audio', 'about-en.mp3');
  const nePath = join(process.cwd(), 'public', 'audio', 'about-ne.mp3');

  await writeFile(enPath, enAudio);
  await writeFile(nePath, neAudio);

  console.log(`[about-audio] Wrote ${enPath} (${Math.round(enAudio.length / 1024)} KB)`);
  console.log(`[about-audio] Wrote ${nePath} (${Math.round(neAudio.length / 1024)} KB)`);
  console.log('[about-audio] Done.');
}

main().catch((err) => {
  console.error('[about-audio] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

