/**
 * Telegram Public Channel Scraper
 *
 * Scrapes public Telegram channels using their web preview pages.
 * No API key required — public channels expose their last ~20 messages
 * at https://t.me/s/[channelname] as plain HTML.
 *
 * How it works:
 *   1. Fetch the public web preview page for each tracked channel
 *   2. Parse HTML to extract messages (text, date, views, links)
 *   3. Upsert into intelligence_signals with deduplication
 *
 * ETHICAL USAGE:
 *   - Public channels ONLY (no private groups or DMs)
 *   - Polite scraping with 3s delay between channel fetches
 *   - Data used for Nepal government accountability tracking
 *
 * To add a new channel, append an entry to TELEGRAM_CHANNELS below.
 */

import { getSupabase } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TelegramChannelConfig {
  /** Internal source ID, e.g. 'telegram-nepal-news' */
  id: string;
  /** Display name */
  name: string;
  /** Public web preview URL: https://t.me/s/[handle] */
  url: string;
  /** Category for grouping */
  category: 'news' | 'politics' | 'government' | 'civil_society';
  /** Related promise IDs for cross-referencing */
  relatedPromiseIds: number[];
}

interface TelegramMessage {
  /** External message ID from data-post attribute, e.g. 'nepalnews/1234' */
  externalId: string;
  /** Message text content */
  text: string;
  /** Direct link to the message */
  url: string;
  /** ISO date string */
  publishedAt: string;
  /** View count (0 if not available) */
  views: number;
  /** Channel handle extracted from the URL */
  channelHandle: string;
}

interface ScrapeResult {
  messagesFound: number;
  newMessages: number;
  errors: string[];
}

// ─── Tracked Channels ────────────────────────────────────────────────────────
// Add new channels here. The URL must be the public web preview format.

export const TELEGRAM_CHANNELS: TelegramChannelConfig[] = [
  // Known active Nepali news/political channels (using t.me/s/ public preview)
  {
    id: 'telegram-nepal-samacharpatra',
    name: 'Nepal Samacharpatra',
    url: 'https://t.me/s/nepalsamacharpatra',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-ratopati-news',
    name: 'Ratopati News',
    url: 'https://t.me/s/ratopatinews',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-nepal-news',
    name: 'Nepal News',
    url: 'https://t.me/s/nepalnews',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-nepal-politics',
    name: 'Nepal Politics',
    url: 'https://t.me/s/nepalpolitics',
    category: 'politics',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-kathmandu-updates',
    name: 'Kathmandu Updates',
    url: 'https://t.me/s/kathmanduupdates',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-onlinekhabar',
    name: 'Online Khabar',
    url: 'https://t.me/s/onlinekhabar',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-setopati',
    name: 'Setopati',
    url: 'https://t.me/s/setopati',
    category: 'news',
    relatedPromiseIds: [],
  },
  {
    id: 'telegram-kantipur',
    name: 'Kantipur Daily',
    url: 'https://t.me/s/kantipurdaily',
    category: 'news',
    relatedPromiseIds: [],
  },
];

// ─── HTML Parsing ────────────────────────────────────────────────────────────

/**
 * Fetch and parse messages from a single Telegram public channel preview.
 */
async function scrapeChannel(channel: TelegramChannelConfig): Promise<TelegramMessage[]> {
  try {
    const res = await fetch(channel.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NepalProgressBot/1.0; +https://nepalprogress.com)',
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(
        `[TelegramScraper] Failed to fetch ${channel.name}: ${res.status}`,
      );
      return [];
    }

    const html = await res.text();
    return parseChannelHtml(html, channel);
  } catch (err) {
    console.error(
      `[TelegramScraper] Error fetching ${channel.name}:`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Parse the Telegram web preview HTML to extract messages.
 *
 * Each message sits inside a `div.tgme_widget_message` with:
 *   - `data-post` attribute → "channelhandle/messageid"
 *   - `.tgme_widget_message_text` → message text (HTML)
 *   - `.tgme_widget_message_date time[datetime]` → ISO datetime
 *   - `.tgme_widget_message_views` → view count string (e.g. "1.2K")
 */
function parseChannelHtml(
  html: string,
  channel: TelegramChannelConfig,
): TelegramMessage[] {
  const messages: TelegramMessage[] = [];

  // Extract the channel handle from the URL for link construction
  const handleMatch = channel.url.match(/t\.me\/s\/([^/?#]+)/);
  const channelHandle = handleMatch ? handleMatch[1] : '';

  // Split HTML into individual message blocks.
  // Each message widget starts with a div that has the data-post attribute.
  const messageBlockRegex =
    /<div[^>]*class="[^"]*tgme_widget_message_wrap[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*tgme_widget_message [^"]*"[^>]*data-post="([^"]*)"[\s\S]*?(?=<div[^>]*class="[^"]*tgme_widget_message_wrap|$)/g;

  // Simpler approach: find all data-post occurrences and extract surrounding content
  const dataPostRegex =
    /data-post="([^"]+)"([\s\S]*?)(?=data-post="|$)/g;

  let match: RegExpExecArray | null;

  while ((match = dataPostRegex.exec(html)) !== null) {
    const dataPost = match[1]; // e.g. "nepalnews/1234"
    const block = match[2];

    // Extract message text from .tgme_widget_message_text
    const textMatch = block.match(
      /<div[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    );
    const rawText = textMatch ? stripHtml(textMatch[1]) : '';

    // Skip very short messages (< 20 chars)
    if (rawText.length < 20) continue;

    // Extract datetime from <time datetime="...">
    const dateMatch = block.match(
      /<time[^>]*datetime="([^"]*)"[^>]*>/,
    );
    const publishedAt = dateMatch ? safeISODate(dateMatch[1]) : new Date().toISOString();

    // Extract view count from .tgme_widget_message_views
    const viewsMatch = block.match(
      /<span[^>]*class="[^"]*tgme_widget_message_views[^"]*"[^>]*>([\s\S]*?)<\/span>/,
    );
    const views = viewsMatch ? parseViewCount(stripHtml(viewsMatch[1])) : 0;

    // Construct the direct message link
    // data-post is "channelhandle/msgid" → link is https://t.me/channelhandle/msgid
    const messageUrl = `https://t.me/${dataPost}`;

    messages.push({
      externalId: dataPost,
      text: rawText,
      url: messageUrl,
      publishedAt,
      views,
      channelHandle,
    });
  }

  return messages;
}

/**
 * Parse Telegram's human-readable view counts like "1.2K", "3.4M", "567".
 */
function parseViewCount(viewStr: string): number {
  const trimmed = viewStr.trim().toUpperCase();
  if (!trimmed) return 0;

  const numMatch = trimmed.match(/^([\d.]+)\s*([KMB]?)$/);
  if (!numMatch) return 0;

  const num = parseFloat(numMatch[1]);
  const suffix = numMatch[2];

  switch (suffix) {
    case 'K':
      return Math.round(num * 1_000);
    case 'M':
      return Math.round(num * 1_000_000);
    case 'B':
      return Math.round(num * 1_000_000_000);
    default:
      return Math.round(num);
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Scrape all tracked Telegram public channels.
 *
 * Fetches the web preview page for each channel, parses messages,
 * and upserts them into intelligence_signals.
 */
export async function scrapeTelegram(): Promise<ScrapeResult> {
  const supabase = getSupabase();
  let messagesFound = 0;
  let newMessages = 0;
  const errors: string[] = [];

  console.log(
    `[TelegramScraper] Starting scrape of ${TELEGRAM_CHANNELS.length} channels`,
  );

  for (const channel of TELEGRAM_CHANNELS) {
    try {
      const messages = await scrapeChannel(channel);
      messagesFound += messages.length;

      // Upsert each message into intelligence_signals
      for (const msg of messages) {
        const { error } = await supabase.from('intelligence_signals').upsert(
          {
            source_id: channel.id,
            signal_type: 'social_post',
            external_id: msg.externalId,
            title: msg.text.slice(0, 200),
            content: msg.text.slice(0, 15000),
            url: msg.url,
            author: channel.name,
            published_at: msg.publishedAt,
            matched_promise_ids: channel.relatedPromiseIds,
            language: detectLanguage(msg.text),
            media_type: 'text',
            metadata: {
              platform: 'telegram',
              channelUrl: channel.url,
              channelName: channel.name,
              channelHandle: msg.channelHandle,
              category: channel.category,
              scrapeMethod: 'web-preview',
              engagement: {
                views: msg.views,
              },
            },
          },
          { onConflict: 'source_id,external_id', ignoreDuplicates: true },
        );

        if (!error) newMessages++;
      }

      // Update or create the intelligence source record
      await supabase.from('intelligence_sources').upsert(
        {
          id: channel.id,
          name: `${channel.name} (Telegram)`,
          source_type: 'telegram_channel' as const,
          url: channel.url,
          config: {
            type: 'telegram_channel_scraper',
            category: channel.category,
            scrapeMethod: 'web-preview',
          },
          related_promise_ids: channel.relatedPromiseIds,
          related_official_ids: [],
          is_active: true,
          last_checked_at: new Date().toISOString(),
          last_found_at: messages.length > 0 ? new Date().toISOString() : undefined,
        },
        { onConflict: 'id' },
      );
    } catch (err) {
      const msg = `${channel.name}: ${err instanceof Error ? err.message : 'unknown error'}`;
      errors.push(msg);
      console.error(`[TelegramScraper] ${msg}`);
    }

    // Rate limit: 3s between channel fetches
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(
    `[TelegramScraper] Complete: ${messagesFound} messages found, ${newMessages} new, ${errors.length} errors`,
  );

  return { messagesFound, newMessages, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectLanguage(text: string): string {
  if (!text) return 'en';
  // Detect Nepali (Devanagari Unicode range)
  const nepaliChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  return nepaliChars / text.length > 0.2 ? 'ne' : 'en';
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function safeISODate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
