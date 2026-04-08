/**
 * Audio/Video Transcription Collector
 *
 * Transcribes audio/video from any URL (Facebook, podcasts, radio, YouTube)
 * using Groq Whisper API. Feeds transcripts into the intelligence signals DB.
 *
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm (max 25MB)
 * Language: Nepali (ne) hint for better accuracy
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = 'whisper-large-v3';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const SUPPORTED_EXTENSIONS = [
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'm4a',
  'wav',
  'webm',
];

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

interface TranscriptionResult {
  url: string;
  transcript: string | null;
  error?: string;
  duration_seconds?: number;
}

interface IngestResult {
  transcribed: number;
  ingested: number;
  errors: string[];
}

export interface TranscribedAudio {
  text: string | null;
  language: string | null;
  durationSeconds: number | null;
}

function getSignalTypeForTranscript(mediaType: 'audio' | 'video'): 'speech' | 'video' {
  return mediaType === 'video' ? 'video' : 'speech';
}

/**
 * Normalize a URL for use as an external_id.
 * Strips trailing slashes, query params for cleanliness, lowercases the host.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Keep path but strip common tracking params
    u.searchParams.delete('utm_source');
    u.searchParams.delete('utm_medium');
    u.searchParams.delete('utm_campaign');
    u.searchParams.delete('fbclid');
    u.searchParams.delete('si');
    return u.toString().replace(/\/+$/, '');
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
}

/**
 * Detect the media type (audio vs video) from a URL.
 */
function detectMediaType(url: string): 'audio' | 'video' {
  const lower = url.toLowerCase();
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('facebook.com/watch') ||
    lower.includes('fb.watch') ||
    lower.includes('.mp4') ||
    lower.includes('video')
  ) {
    return 'video';
  }
  return 'audio';
}

/**
 * Guess a filename extension from URL or content-type header.
 */
function guessExtension(url: string, contentType?: string | null): string {
  // Try URL path
  const urlPath = new URL(url).pathname;
  const extMatch = urlPath.match(/\.(\w{2,5})$/);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) return ext;
  }

  // Try content-type
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('mp3') || ct.includes('mpeg')) return 'mp3';
    if (ct.includes('mp4')) return 'mp4';
    if (ct.includes('wav')) return 'wav';
    if (ct.includes('webm')) return 'webm';
    if (ct.includes('m4a') || ct.includes('mp4')) return 'm4a';
  }

  // Default to mp3
  return 'mp3';
}

/**
 * Check if a URL is a YouTube video URL.
 */
function isYouTubeUrl(url: string): boolean {
  return (
    url.includes('youtube.com/watch') ||
    url.includes('youtu.be/') ||
    url.includes('youtube.com/shorts/')
  );
}

/**
 * Extract YouTube video ID from a URL.
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Download audio bytes from a direct URL.
 * Returns the audio buffer and metadata, or null if too large / failed.
 */
async function downloadAudio(
  url: string,
): Promise<{ buffer: Buffer; extension: string; size: number } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NepalProgress/1.0; +https://nepalprogress.com)',
      },
    });

    if (!res.ok) {
      console.warn(`[audio-transcriber] Failed to download ${url}: ${res.status}`);
      return null;
    }

    // Check content-length before downloading fully
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.warn(
        `[audio-transcriber] File too large: ${url} (${contentLength} bytes, max ${MAX_FILE_SIZE})`,
      );
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      console.warn(
        `[audio-transcriber] Downloaded file too large: ${url} (${buffer.length} bytes)`,
      );
      return null;
    }

    const extension = guessExtension(url, res.headers.get('content-type'));
    return { buffer, extension, size: buffer.length };
  } catch (err) {
    console.error(
      `[audio-transcriber] Download error for ${url}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Send audio buffer to Groq Whisper for transcription.
 */
async function callGroqWhisper(
  audioBuffer: Buffer,
  extension: string,
  language = 'ne',
): Promise<string | null> {
  const verbose = await callGroqWhisperVerbose(audioBuffer, extension, language);
  return verbose.text;
}

async function callGroqWhisperVerbose(
  audioBuffer: Buffer,
  extension: string,
  language = 'ne',
): Promise<TranscribedAudio> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[audio-transcriber] GROQ_API_KEY not configured');
    return { text: null, language: null, durationSeconds: null };
  }

  const mimeType = SUPPORTED_MIME_TYPES[extension] || 'audio/mpeg';
  const filename = `audio.${extension}`;
  const blobBuffer = new ArrayBuffer(audioBuffer.byteLength);
  new Uint8Array(blobBuffer).set(audioBuffer);

  // Nepali civic domain prompt — conditions Whisper's vocabulary for better accuracy
  const NEPALI_CIVIC_PROMPT =
    'काठमाडौं ललितपुर भक्तपुर पोखरा बिराटनगर जनकपुर बुटवल धरान इटहरी ' +
    'सडक खाल्डो पानी बिजुली ढल फोहर स्वास्थ्य शिक्षा विद्यालय अस्पताल ' +
    'वडा कार्यालय नगरपालिका गाउँपालिका महानगरपालिका उपमहानगरपालिका प्रदेश सरकार ' +
    'मन्त्रालय मन्त्री सचिव निर्देशक प्रमुख जिल्ला अधिकारी ' +
    'बजेट विनियोजन भ्रष्टाचार घुस अनियमितता लापरवाही ठेक्का निर्माण ' +
    'खानेपानी सिंचाई बाटो पुल नाला ट्राफिक प्रहरी सुरक्षा ' +
    'इन्टरनेट दूरसञ्चार रोजगारी बेरोजगारी वातावरण प्रदूषण फोहरमैला ' +
    'नागरिक उजुरी गुनासो समस्या समाधान जवाफदेही';

  // Build multipart form data
  const formData = new FormData();
  formData.append('file', new Blob([blobBuffer], { type: mimeType }), filename);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');
  // Add domain prompt for Nepali to dramatically improve accuracy
  if (language === 'ne') {
    formData.append('prompt', NEPALI_CIVIC_PROMPT);
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120_000), // 2 min for large files
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      console.error(
        `[audio-transcriber] Groq Whisper error ${res.status}: ${errorBody}`,
      );
      return { text: null, language: null, durationSeconds: null };
    }

    const result = await res.json();
    return {
      text: typeof result.text === 'string' ? result.text : null,
      language: typeof result.language === 'string' ? result.language : null,
      durationSeconds:
        typeof result.duration === 'number' && Number.isFinite(result.duration)
          ? result.duration
          : null,
    };
  } catch (err) {
    console.error(
      '[audio-transcriber] Groq Whisper request failed:',
      err instanceof Error ? err.message : err,
    );
    return { text: null, language: null, durationSeconds: null };
  }
}

function extensionFromFilename(filename?: string | null): string | null {
  if (!filename) return null;
  const match = filename.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  if (!match) return null;
  return SUPPORTED_EXTENSIONS.includes(match[1]) ? match[1] : null;
}

function extensionFromMimeType(mimeType?: string | null): string | null {
  if (!mimeType) return null;
  const lower = mimeType.toLowerCase();
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  if (lower.includes('mp4')) return 'mp4';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('m4a')) return 'm4a';
  return null;
}

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  options?: {
    extension?: string | null;
    filename?: string | null;
    mimeType?: string | null;
    language?: string;
  },
): Promise<TranscribedAudio> {
  if (!audioBuffer || audioBuffer.length === 0 || audioBuffer.length > MAX_FILE_SIZE) {
    return { text: null, language: null, durationSeconds: null };
  }

  const normalizedExt = (options?.extension || '').toLowerCase();
  const extension = SUPPORTED_EXTENSIONS.includes(normalizedExt)
    ? normalizedExt
    : extensionFromFilename(options?.filename) ||
      extensionFromMimeType(options?.mimeType) ||
      'webm';

  return callGroqWhisperVerbose(
    audioBuffer,
    extension,
    options?.language || 'ne',
  );
}

/**
 * Transcribe audio from any direct URL.
 * Downloads the file, sends to Groq Whisper, returns transcript text.
 */
export async function transcribeAudioUrl(
  url: string,
): Promise<string | null> {
  // If it's a YouTube URL, delegate to the YouTube-specific function
  if (isYouTubeUrl(url)) {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) return transcribeYouTubeVideo(videoId);
  }

  console.log(`[audio-transcriber] Transcribing: ${url}`);

  const audio = await downloadAudio(url);
  if (!audio) return null;

  console.log(
    `[audio-transcriber] Downloaded ${audio.size} bytes (${audio.extension}), sending to Whisper...`,
  );

  const transcript = await callGroqWhisper(audio.buffer, audio.extension);
  if (transcript) {
    console.log(
      `[audio-transcriber] Transcribed ${transcript.length} chars from ${url}`,
    );
  }

  return transcript;
}

/**
 * Transcribe a YouTube video by ID.
 * Uses YouTube's innertube API to extract an audio stream URL, downloads it,
 * and sends to Groq Whisper. Serves as a FALLBACK when YouTube captions
 * aren't available.
 */
export async function transcribeYouTubeVideo(
  videoId: string,
): Promise<string | null> {
  console.log(`[audio-transcriber] Transcribing YouTube video: ${videoId}`);

  // Try to get an audio stream URL via YouTube's innertube player API
  const audioUrl = await extractYouTubeAudioUrl(videoId);
  if (!audioUrl) {
    console.warn(
      `[audio-transcriber] Could not extract audio URL for YouTube video ${videoId}`,
    );
    return null;
  }

  const audio = await downloadAudio(audioUrl);
  if (!audio) {
    console.warn(
      `[audio-transcriber] Failed to download YouTube audio for ${videoId}`,
    );
    return null;
  }

  console.log(
    `[audio-transcriber] Downloaded YouTube audio: ${audio.size} bytes (${audio.extension})`,
  );

  return callGroqWhisper(audio.buffer, audio.extension);
}

/**
 * Extract an audio stream URL from YouTube using the innertube player API.
 * This is a lightweight approach that doesn't require youtube-dl.
 */
async function extractYouTubeAudioUrl(
  videoId: string,
): Promise<string | null> {
  try {
    // Use YouTube's innertube player endpoint
    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();

    // Look for audio-only adaptive formats
    const adaptiveFormats =
      data?.streamingData?.adaptiveFormats || [];

    // Prefer audio-only webm/mp4, sorted by quality (lower bitrate = smaller file)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioFormats = adaptiveFormats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((f: any) => f.mimeType?.startsWith('audio/'))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.contentLength || 0) - (b.contentLength || 0));

    if (audioFormats.length === 0) return null;

    // Pick the smallest audio stream that's under 25MB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suitable = audioFormats.find((f: any) => {
      const size = parseInt(f.contentLength || '0');
      return size > 0 && size <= MAX_FILE_SIZE;
    });

    // If none are small enough, try the smallest one anyway (download will check size)
    const chosen = suitable || audioFormats[0];
    return chosen?.url || null;
  } catch (err) {
    console.error(
      `[audio-transcriber] YouTube innertube extraction failed for ${videoId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Batch transcribe and ingest a list of audio/video URLs into the
 * intelligence_signals database.
 *
 * Each URL is processed independently; failures don't block other URLs.
 */
export async function transcribeAndIngest(
  urls: string[],
): Promise<IngestResult> {
  const { getSupabase } = await import('@/lib/supabase/server');
  const supabase = getSupabase();

  let transcribed = 0;
  let ingested = 0;
  const errors: string[] = [];

  for (const url of urls) {
    const normalizedUrl = normalizeUrl(url);

    try {
      // Check if already ingested
      const { data: existing } = await supabase
        .from('intelligence_signals')
        .select('id')
        .eq('source_id', 'audio-transcribe')
        .eq('external_id', normalizedUrl)
        .maybeSingle();

      if (existing) {
        console.log(
          `[audio-transcriber] Already ingested, skipping: ${normalizedUrl}`,
        );
        continue;
      }

      // Transcribe
      const transcript = await transcribeAudioUrl(url);
      if (!transcript) {
        errors.push(`Failed to transcribe: ${url}`);
        continue;
      }
      transcribed++;

      // Determine media type
      const mediaType = detectMediaType(url);
      const signalType = getSignalTypeForTranscript(mediaType);

      // Upsert into intelligence_signals
      const { error: upsertError } = await supabase
        .from('intelligence_signals')
        .upsert(
          {
            source_id: 'audio-transcribe',
            signal_type: signalType,
            external_id: normalizedUrl,
            title: `Transcript: ${new URL(url).hostname}${new URL(url).pathname.slice(0, 60)}`,
            content: transcript.slice(0, 50000), // Cap at 50k chars
            url: normalizedUrl,
            language: 'ne',
            media_type: mediaType,
            metadata: {
              original_url: url,
              transcript_length: transcript.length,
              transcription_model: GROQ_WHISPER_MODEL,
              transcribed_at: new Date().toISOString(),
              transcript_source_type: signalType,
            },
          },
          {
            onConflict: 'source_id,external_id',
          },
        );

      if (upsertError) {
        errors.push(`DB upsert failed for ${url}: ${upsertError.message}`);
      } else {
        ingested++;
      }
    } catch (err) {
      errors.push(
        `Error processing ${url}: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }

    // Small delay between URLs to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update the intelligence_sources record
  try {
    await supabase.from('intelligence_sources').upsert(
      {
        id: 'audio-transcribe',
        name: 'Audio/Video Transcriber (Groq Whisper)',
        source_type: 'podcast' as const,
        url: 'https://api.groq.com',
        config: {
          model: GROQ_WHISPER_MODEL,
          language: 'ne',
          maxFileSize: MAX_FILE_SIZE,
        },
        is_active: true,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    // Non-critical
  }

  return { transcribed, ingested, errors };
}
