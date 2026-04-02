/**
 * RSS Feed Collector
 * Fetches and parses RSS/Atom feeds from news sites
 * More reliable than HTML scraping for news sources
 */
import { getSupabase } from '@/lib/supabase/server';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
}

interface RSSSource {
  id: string;
  name: string;
  feedUrl: string;
  language: 'en' | 'ne';
  relatedPromiseIds: number[];
}

// Nepal news RSS feeds (44 active sources — 4 commented out due to feed/site issues)
export const RSS_FEEDS: RSSSource[] = [
  // ── English feeds ──────────────────────────────────────
  {
    id: 'rss-kathmandu-post',
    name: 'Kathmandu Post',
    feedUrl: 'https://kathmandupost.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-online-khabar-en',
    name: 'Online Khabar (EN)',
    feedUrl: 'https://english.onlinekhabar.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-khabarhub-en',
    name: 'Khabarhub (EN)',
    feedUrl: 'https://english.khabarhub.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-ratopati-en',
    name: 'Ratopati (EN)',
    feedUrl: 'https://english.ratopati.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-himalayan-times',
    name: 'The Himalayan Times',
    feedUrl: 'https://thehimalayantimes.com/rssFeed/14',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-myrepublica',
    name: 'myRepublica',
    feedUrl: 'https://myrepublica.nagariknetwork.com/feeds',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepali-times',
    name: 'Nepali Times',
    feedUrl: 'https://www.nepalitimes.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-annapurna-express',
    name: 'The Annapurna Express',
    feedUrl: 'https://theannapurnaexpress.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-rising-nepal',
    name: 'The Rising Nepal',
    feedUrl: 'https://risingnepaldaily.com/rss',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepal-news-en',
    name: 'Nepal News (EN)',
    feedUrl: 'https://english.nepalnews.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  // NOTE: Nepal Live Today (nepallivetoday.com) – domain no longer resolves (DNS failure). Site appears permanently down. Commented out 2026-03-22.
  // {
  //   id: 'rss-nepal-live-today',
  //   name: 'Nepal Live Today',
  //   feedUrl: 'https://nepallivetoday.com/feed/',
  //   language: 'en',
  //   relatedPromiseIds: [],
  // },

  // ── Nepali feeds ───────────────────────────────────────
  {
    id: 'rss-setopati-ne',
    name: 'Setopati (NE)',
    feedUrl: 'https://setopati.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-ekantipur',
    name: 'eKantipur',
    feedUrl: 'https://ekantipur.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nagarik',
    name: 'Nagarik News',
    feedUrl: 'https://nagariknews.nagariknetwork.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-annapurna-post',
    name: 'Annapurna Post',
    feedUrl: 'https://annapurnapost.com/rss',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-gorkhapatra',
    name: 'Gorkhapatra Online',
    feedUrl: 'https://gorkhapatraonline.com/rss',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-onlinekhabar-ne',
    name: 'Online Khabar (NE)',
    feedUrl: 'https://www.onlinekhabar.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  // NOTE: Ratopati Nepali (ratopati.com/feed) – returns 403 with message "contact administration for access". RSS feed deliberately restricted. Commented out 2026-03-22.
  // {
  //   id: 'rss-ratopati-ne',
  //   name: 'Ratopati (NE)',
  //   feedUrl: 'https://ratopati.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  // NOTE: Ujyaalo Online (ujyaaloonline.com) – Cloudflare bot protection blocks all automated feed access (403). Commented out 2026-03-22.
  // {
  //   id: 'rss-ujyaalo',
  //   name: 'Ujyaalo Online',
  //   feedUrl: 'https://ujyaaloonline.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  // NOTE: Naya Patrika (nayapatrikadaily.com) – site returns 502/403 errors on all endpoints including homepage. Appears down or misconfigured. Commented out 2026-03-22.
  // {
  //   id: 'rss-nayapatrika',
  //   name: 'Naya Patrika',
  //   feedUrl: 'https://nayapatrikadaily.com/feed',
  //   language: 'ne',
  //   relatedPromiseIds: [],
  // },
  {
    id: 'rss-bbc-nepali',
    name: 'BBC Nepali',
    feedUrl: 'https://feeds.bbci.co.uk/nepali/rss.xml',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-khabarhub-ne',
    name: 'Khabarhub (NE)',
    feedUrl: 'https://khabarhub.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Additional English feeds ──────────────────────────────────────────────
  {
    id: 'ujyaalo-en',
    name: 'Ujyaalo Online',
    feedUrl: 'https://ujyaaloonline.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'nepal-press',
    name: 'Nepal Press',
    feedUrl: 'https://nepalpress.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'reporters-nepal',
    name: 'Reporters Nepal',
    feedUrl: 'https://reportersnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'himal-south',
    name: 'Himal Southasian',
    feedUrl: 'https://www.himalmag.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'record-nepal',
    name: 'The Record Nepal',
    feedUrl: 'https://www.recordnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepal-agency',
    name: 'RSS Nepal (National News Agency)',
    feedUrl: 'https://www.rssnepal.com/feed',
    language: 'en',
    relatedPromiseIds: [],
  },

  // ── Additional Nepali feeds ─────────────────────────────────────────────
  {
    id: 'pahilopost-ne',
    name: 'PahiloPost',
    feedUrl: 'https://pahilopost.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'naya-patrika-ne',
    name: 'Naya Patrika',
    feedUrl: 'https://nayapatrikadaily.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'baahrakhari-ne',
    name: 'Baahrakhari',
    feedUrl: 'https://baahrakhari.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'deshsanchar-ne',
    name: 'Deshsanchar',
    feedUrl: 'https://deshsanchar.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'lokpath-ne',
    name: 'Lokpath',
    feedUrl: 'https://lokpath.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'nepal-samaya-ne',
    name: 'Nepal Samaya',
    feedUrl: 'https://nepalsamaya.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Additional English feeds (batch 2) ──────────────────────────────────────
  {
    id: 'rss-dcnepal',
    name: 'DC Nepal English',
    feedUrl: 'https://dcnepal.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-south-asia-check',
    name: 'South Asia Check',
    feedUrl: 'https://southasiacheck.org/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepal-monitor',
    name: 'Nepal Monitor',
    feedUrl: 'https://nepalmonitor.org/feed',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepali-sansar',
    name: 'Nepali Sansar',
    feedUrl: 'https://www.nepalisansar.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-spotlight-nepal',
    name: 'Spotlight Nepal',
    feedUrl: 'https://www.spotlightnepal.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },

  // ── Additional Nepali feeds (batch 2) ─────────────────────────────────────
  {
    id: 'rss-lokantar',
    name: 'Lokantar',
    feedUrl: 'https://lokantar.com/feed',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-arthadabali',
    name: 'Arthadabali',
    feedUrl: 'https://arthadabali.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-bizmandu',
    name: 'Bizmandu',
    feedUrl: 'https://bizmandu.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-swasthya-khabar',
    name: 'Swasthya Khabar',
    feedUrl: 'https://swasthyakhabar.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-arthapath',
    name: 'Arthapath',
    feedUrl: 'https://arthapath.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-hamrakura',
    name: 'Hamrakura',
    feedUrl: 'https://hamrakura.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-nepalpress-ne',
    name: 'Nepal Press Nepali',
    feedUrl: 'https://nepalpress.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-techmandu',
    name: 'Techmandu',
    feedUrl: 'https://techmandu.com/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Independent / Opinion ──────────────────────────────────────────────────
  {
    id: 'sasmit-pokhrel',
    name: 'Sasmit Pokhrel',
    feedUrl: 'https://sasmitpokhrel.com/feed/',
    language: 'en',
    relatedPromiseIds: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HIGH-VALUE SOURCES — International orgs, think tanks, accountability
  // These produce fewer articles but each one is highly relevant evidence
  // ══════════════════════════════════════════════════════════════════════════

  // ── International Development Organizations ──
  {
    id: 'rss-worldbank-nepal',
    name: 'World Bank Nepal',
    feedUrl: 'https://www.worldbank.org/en/country/nepal/rss.xml',
    language: 'en',
    relatedPromiseIds: [8, 9, 14, 57, 84],
  },
  {
    id: 'rss-adb-nepal',
    name: 'Asian Development Bank Nepal',
    feedUrl: 'https://www.adb.org/countries/nepal/main?feed=atom',
    language: 'en',
    relatedPromiseIds: [8, 15, 65, 84],
  },
  {
    id: 'rss-undp-nepal',
    name: 'UNDP Nepal',
    feedUrl: 'https://www.undp.org/nepal/rss.xml',
    language: 'en',
    relatedPromiseIds: [57, 105, 108],
  },
  {
    id: 'rss-who-nepal',
    name: 'WHO Nepal',
    feedUrl: 'https://www.who.int/nepal/rss-feeds/news/rss.xml',
    language: 'en',
    relatedPromiseIds: [22, 93, 96],
  },
  {
    id: 'rss-unicef-nepal',
    name: 'UNICEF Nepal',
    feedUrl: 'https://www.unicef.org/nepal/rss.xml',
    language: 'en',
    relatedPromiseIds: [24, 26, 91, 93],
  },
  {
    id: 'rss-ilo-nepal',
    name: 'ILO Nepal',
    feedUrl: 'https://www.ilo.org/gateway/faces/home/ctryHome?locale=EN&countryCode=NPL&_adf.ctrl-state=rss',
    language: 'en',
    relatedPromiseIds: [9, 34, 74],
  },
  {
    id: 'rss-reliefweb-nepal',
    name: 'ReliefWeb Nepal',
    feedUrl: 'https://reliefweb.int/updates/rss.xml?search-query=country:Nepal&limit=20',
    language: 'en',
    relatedPromiseIds: [96, 108, 105],
  },

  // ── Think Tanks & Policy Research ──
  {
    id: 'rss-nefport',
    name: 'Nepal Economic Forum',
    feedUrl: 'https://nepaleconomicforum.org/feed/',
    language: 'en',
    relatedPromiseIds: [8, 10, 63, 87],
  },
  {
    id: 'rss-nepal-policy-institute',
    name: 'Nepal Policy Institute',
    feedUrl: 'https://nepalpolicyinstitute.org/feed/',
    language: 'en',
    relatedPromiseIds: [1, 30, 101],
  },
  {
    id: 'rss-cij-nepal',
    name: 'Center for Investigative Journalism Nepal',
    feedUrl: 'https://cijnepal.org.np/feed/',
    language: 'en',
    relatedPromiseIds: [4, 31, 47],
  },
  {
    id: 'rss-transparency-intl',
    name: 'Transparency International Nepal',
    feedUrl: 'https://tinepal.org/feed/',
    language: 'en',
    relatedPromiseIds: [4, 5, 7, 47],
  },

  // ── RSP Official Sources ──
  {
    id: 'rss-rsp-nepal',
    name: 'RSP Nepal Official',
    feedUrl: 'https://rspnepal.org/feed/',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── YouTube Channels (via RSS) ──
  // YouTube provides RSS feeds for channels at:
  // https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
  {
    id: 'yt-nepal-parliament',
    name: 'Nepal Parliament TV',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpSgTMgWR1QOYX6WMBllVTQ',
    language: 'ne',
    relatedPromiseIds: [1, 2, 38, 42],
  },
  {
    id: 'yt-rsp-official',
    name: 'RSP Official YouTube',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCxr4I5I6N3DGu1CvME-t5Rg',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-image-channel',
    name: 'Image Channel News',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcWZSWRsCPKnT3yIe1Hfwlw',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-kantipur-tv',
    name: 'Kantipur TV',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCwXJYnFBSQEtaXaROmPANKw',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-news24-nepal',
    name: 'News24 Nepal',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHhEfSm0OOVHq4h2FKXS8RA',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-himalaya-tv',
    name: 'Himalaya TV',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCb2XgCXS9AB_iNjXhQvxJtA',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-news24-nepal-main',
    name: 'News24 Nepal',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCjG2HX7jfwqIjzTlaF1CPGA',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-kantipur-tv-hd',
    name: 'Kantipur TV HD',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC3yDoaqQzOd1bNP74ZrGPTA',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-nepal-television',
    name: 'Nepal Television (NTV)',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCTGVQIvtPu5kqNI5ABmN8Fw',
    language: 'ne',
    relatedPromiseIds: [1, 2, 38, 42],
  },
  {
    id: 'yt-onlinetv-nepal',
    name: 'Onlinetv Nepal',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbzFzlBEU_xFahqhGbEMJXQ',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-inside-nepal-news',
    name: 'Inside Nepal News',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC3v3VpUyf34SLfN1IyUlMeA',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-ap1-tv',
    name: 'AP1 HD Television',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFlPB2adH_uHaJfUCODTdrQ',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-prime-times',
    name: 'Prime Times Television',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCL1Zr3XniRSwZOcqnpAKtfg',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-nepali-comment',
    name: 'The Nepali Comment',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIUpvBA9ibPWHaDeH0G49Aw',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-balen-shah',
    name: 'Balen Shah (PM)',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJgcDT2XI3cQJhGe01AFaHQ',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-kendrabindu',
    name: 'Kendrabindu News',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCPEwoZthpr3YZzrvlowpqgw',
    language: 'ne',
    relatedPromiseIds: [],
  },
  {
    id: 'yt-ratopati-tv',
    name: 'Ratopati TV',
    feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1ev3ii9O4RuUVZ-5mfOBQQ',
    language: 'ne',
    relatedPromiseIds: [],
  },

  // ── Specialized / Sector Sources ──
  {
    id: 'rss-sharesansar',
    name: 'ShareSansar (Stock Market)',
    feedUrl: 'https://www.sharesansar.com/rss',
    language: 'en',
    relatedPromiseIds: [62],
  },
  {
    id: 'rss-ictframe',
    name: 'ICT Frame (Tech News)',
    feedUrl: 'https://ictframe.com/feed/',
    language: 'en',
    relatedPromiseIds: [18, 19, 20, 70, 71, 75, 76, 77, 78],
  },
  {
    id: 'rss-fiscal-nepal',
    name: 'Fiscal Nepal (Economy)',
    feedUrl: 'https://www.fiscalnepal.com/feed/',
    language: 'en',
    relatedPromiseIds: [8, 10, 11, 53, 87],
  },
  {
    id: 'rss-new-business-age',
    name: 'New Business Age',
    feedUrl: 'https://www.newbusinessage.com/feed',
    language: 'en',
    relatedPromiseIds: [8, 9, 10, 53, 54, 87],
  },
  {
    id: 'rss-farsight-nepal',
    name: 'Farsight Nepal',
    feedUrl: 'https://farsightnepal.com/feed/',
    language: 'en',
    relatedPromiseIds: [1, 2, 6],
  },

  // ── Human Rights & Social Justice ──
  {
    id: 'rss-amnesty-nepal',
    name: 'Amnesty International Nepal',
    feedUrl: 'https://www.amnesty.org/en/location/asia-and-the-pacific/south-asia/nepal/rss.xml',
    language: 'en',
    relatedPromiseIds: [33, 36, 37, 50, 51],
  },
  {
    id: 'rss-hrw-nepal',
    name: 'Human Rights Watch Nepal',
    feedUrl: 'https://www.hrw.org/asia/nepal/feed',
    language: 'en',
    relatedPromiseIds: [33, 36, 37, 50, 51],
  },

  // ── Climate & Environment ──
  {
    id: 'rss-icimod',
    name: 'ICIMOD (Mountain Development)',
    feedUrl: 'https://www.icimod.org/feed/',
    language: 'en',
    relatedPromiseIds: [105, 106, 108],
  },
];

function parseXML(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Simple regex-based XML parsing (no dependency needed)
  // Match both RSS <item> and Atom <entry> formats
  const itemRegex =
    /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2] || '';

    const title = extractTag(block, 'title');
    const link =
      extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content');
    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated');
    const author =
      extractTag(block, 'author') || extractTag(block, 'dc:creator');

    // Extract categories
    const categories: string[] = [];
    const catRegex =
      /<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(block)) !== null) {
      categories.push(catMatch[1].trim());
    }

    if (title && link) {
      items.push({
        title: cleanCDATA(title),
        link: cleanCDATA(link),
        description: description
          ? cleanCDATA(description).slice(0, 1000)
          : undefined,
        pubDate: pubDate || undefined,
        author: author ? cleanCDATA(author) : undefined,
        categories: categories.length > 0 ? categories : undefined,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i',
  );
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string,
): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

function cleanCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export async function collectRSS(
  source: RSSSource,
): Promise<{
  items: RSSItem[];
  errors: string[];
}> {
  const errors: string[] = [];
  const timeoutMs = Math.max(
    3_000,
    Number.parseInt(process.env.INTELLIGENCE_RSS_TIMEOUT_MS || '8000', 10) ||
      8_000,
  );

  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        'User-Agent':
          'NepalRepublic/2.0 (civic-tracker; +https://nepalrepublic.org)',
        Accept:
          'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      errors.push(`${source.name}: HTTP ${res.status}`);
      return { items: [], errors };
    }

    const xml = await res.text();
    const items = parseXML(xml);

    return { items, errors };
  } catch (err) {
    errors.push(
      `${source.name}: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
    return { items: [], errors };
  }
}

export async function collectAllRSS(): Promise<{
  totalItems: number;
  newItems: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  const concurrency = Math.max(
    1,
    Math.min(
      Number.parseInt(process.env.INTELLIGENCE_RSS_CONCURRENCY || '8', 10) || 8,
      20,
    ),
  );

  let cursor = 0;
  const results = await Promise.all(
    Array.from({ length: concurrency }, async () => {
      let totalItems = 0;
      let newItems = 0;
      const errors: string[] = [];

      while (true) {
        const nextIndex = cursor;
        cursor += 1;
        if (nextIndex >= RSS_FEEDS.length) break;

        const source = RSS_FEEDS[nextIndex];
        const { items, errors: feedErrors } = await collectRSS(source);
        errors.push(...feedErrors);
        totalItems += items.length;

        if (items.length > 0) {
          const isNepaliSource = source.language === 'ne';
          const payload = items.map((item) => ({
            source_id: source.id,
            signal_type: 'article',
            external_id: item.link,
            // When source is Nepali, store title in title_ne and leave title for English
            title: isNepaliSource ? (item.title || '').slice(0, 200) : item.title,
            title_ne: isNepaliSource ? item.title : null,
            content: item.description || null,
            url: item.link,
            author: item.author || null,
            published_at: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : null,
            discovered_at: new Date().toISOString(),
            language: source.language,
            media_type: 'text',
            metadata: { categories: item.categories || [] },
          }));

          const { error } = await supabase.from('intelligence_signals').upsert(
            payload,
            {
              onConflict: 'source_id,external_id',
              ignoreDuplicates: true,
            },
          );

          if (!error) {
            // Approximate "new" count for pipeline metrics.
            newItems += payload.length;
          } else {
            errors.push(`${source.name}: DB upsert failed (${error.message})`);
          }
        }

        await supabase.from('intelligence_sources').upsert(
          {
            id: source.id,
            name: source.name,
            source_type: 'rss' as const,
            url: source.feedUrl,
            related_promise_ids: source.relatedPromiseIds,
            is_active: true,
            last_checked_at: new Date().toISOString(),
            ...(items.length > 0
              ? { last_found_at: new Date().toISOString() }
              : {}),
          },
          { onConflict: 'id' },
        );
      }

      return { totalItems, newItems, errors };
    }),
  );

  return {
    totalItems: results.reduce((sum, row) => sum + row.totalItems, 0),
    newItems: results.reduce((sum, row) => sum + row.newItems, 0),
    errors: results.flatMap((row) => row.errors),
  };
}
