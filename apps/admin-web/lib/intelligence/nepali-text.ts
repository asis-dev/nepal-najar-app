const HINDI_TO_NEPALI_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bऔर\b/g, 'र'],
  [/\bलेकिन\b/g, 'तर'],
  [/\bक्योंकि\b/g, 'किनभने'],
  [/\bयह\b/g, 'यो'],
  [/\bइस\b/g, 'यस'],
  [/\bहै\b/g, 'छ'],
  [/\bहैं\b/g, 'छन्'],
  [/\bकिया\b/g, 'गरियो'],
  [/\bकिए\b/g, 'गरियो'],
];

const HINDI_MARKERS = /\b(और|लेकिन|क्योंकि|यह|इस|है|हैं|किया|किए)\b/g;
const DEVANAGARI_CHAR = /[\u0900-\u097F]/g;

export function normalizeNepaliRegister(text: string): string {
  let normalized = (text || '').trim();
  for (const [pattern, replacement] of HINDI_TO_NEPALI_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/\s+([।,!?])/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function looksLikeNepali(text: string): boolean {
  const value = (text || '').trim();
  if (!value) return false;
  const devanagariCount = (value.match(DEVANAGARI_CHAR) || []).length;
  return devanagariCount / Math.max(1, value.length) >= 0.2;
}

export function isHindiLeaning(text: string): boolean {
  const value = (text || '').trim();
  if (!value) return false;
  const markers = value.match(HINDI_MARKERS) || [];
  const devanagariCount = (value.match(DEVANAGARI_CHAR) || []).length;
  if (devanagariCount < 20) return markers.length >= 2;
  return markers.length >= 3;
}
