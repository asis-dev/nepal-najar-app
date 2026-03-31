/**
 * Source Name Resolution
 *
 * Maps raw source_id values (like "rss-bizmandu", "yt-prime-times")
 * to human-readable display names. Used everywhere a source name is shown.
 */

/** Known source display names — covers all RSS, YouTube, and social sources */
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  // ── Nepali news (RSS) ──
  'rss-onlinekhabar-ne': 'OnlineKhabar',
  'rss-onlinekhabar-en': 'OnlineKhabar',
  'rss-setopati-ne': 'Setopati',
  'rss-setopati-en': 'Setopati',
  'rss-ekantipur-ne': 'Kantipur',
  'rss-ekantipur-en': 'Kantipur',
  'rss-kathmandupost': 'Kathmandu Post',
  'rss-myrepublica': 'Republica',
  'rss-thehimalayantimes': 'Himalayan Times',
  'rss-nepalipaisa': 'Nepali Paisa',
  'rss-nayapatrika': 'Naya Patrika',
  'rss-ratopati': 'Ratopati',
  'rss-khabarhub': 'Khabarhub',
  'rss-lokantar': 'Lokantar',
  'rss-dcnepal': 'DC Nepal',
  'rss-nepalpress-ne': 'Nepal Press',
  'rss-arthadabali': 'Artha Dabali',
  'rss-arthapath': 'Arthapath',
  'rss-bizmandu': 'Bizmandu',
  'rss-fiscal-nepal': 'Fiscal Nepal',
  'rss-techmandu': 'Techmandu',
  'rss-pahilopost': 'Pahilo Post',
  'rss-himalpress': 'Himal Press',
  'rss-nepalnews': 'Nepal News',
  'rss-nagariknews': 'Nagarik News',
  'rss-rajdhani': 'Rajdhani',
  'rss-gorkhapatra': 'Gorkhapatra',
  'rss-risingnepal': 'Rising Nepal',
  'rss-nepalkhabar': 'Nepal Khabar',
  'lokpath-ne': 'Lokpath',

  // ── International / Think tanks (RSS) ──
  'rss-worldbank-nepal': 'World Bank',
  'rss-adb-nepal': 'Asian Development Bank',
  'rss-undp-nepal': 'UNDP Nepal',
  'rss-who-nepal': 'WHO Nepal',
  'rss-unicef-nepal': 'UNICEF Nepal',
  'rss-ilo-nepal': 'ILO Nepal',
  'rss-reliefweb-nepal': 'ReliefWeb',
  'rss-nefport': 'Nepal Economic Forum',
  'rss-nepal-policy-institute': 'Nepal Policy Institute',
  'rss-cij-nepal': 'CIJ Nepal',
  'rss-transparency-intl': 'Transparency International',
  'rss-rsp-nepal': 'RSP Official',

  // ── YouTube ──
  'yt-news24-nepal': 'News24 Nepal',
  'yt-kantipur-tv-hd': 'Kantipur TV',
  'yt-nepal-television': 'Nepal Television',
  'yt-ap1-hd': 'AP1 HD',
  'yt-avnews': 'AV News',
  'yt-image-channel': 'Image Channel',
  'yt-prime-times': 'Prime Times',
  'yt-balen-shah': 'Balen Shah',
  'yt-rabi-lamichhane': 'Rabi Lamichhane',
  'yt-sasmit-pokhrel': 'Sasmit Pokhrel',
  'yt-nepal-parliament': 'Nepal Parliament TV',
  'yt-rsp-official': 'RSP Official',

  // ── Facebook ──
  'fb-balen-shah': 'Balen Shah (FB)',
  'fb-rabi-lamichhane': 'Rabi Lamichhane (FB)',
  'fb-rsp-nepal': 'RSP Nepal (FB)',
  'fb-sasmit-pokhrel': 'Sasmit Pokhrel (FB)',

  // ── Twitter/X ──
  'tw-pm-nepal': 'PM Office Nepal',
  'tw-mofa-nepal': 'MoFA Nepal',

  // ── Historical/archive sources ──
  'historical-scan': 'Historical Archive (Paused)',
  'google-news-historical': 'Google News',
};

/**
 * Convert a raw source_id to a human-readable display name.
 * Falls back to cleaning the ID (strip prefix, capitalize).
 */
export function resolveSourceDisplayName(sourceId: string): string {
  if (!sourceId) return 'Unknown';

  // Check known names first
  const known = SOURCE_DISPLAY_NAMES[sourceId];
  if (known) return known;

  // Fallback: strip common prefixes and clean up
  return sourceId
    .replace(/^(rss-|yt-|fb-|tw-|tt-|tg-|google-)/, '')
    .replace(/-ne$|-en$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
