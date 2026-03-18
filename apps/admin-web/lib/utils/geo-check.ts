/**
 * Nepal Geo-Verification for voting integrity
 *
 * Strategy:
 * 1. Primary: Check IP geolocation via free API
 * 2. Fallback: Check timezone (Asia/Kathmandu, UTC+5:45 = offset -345)
 * 3. Cache result for the session to avoid repeated API calls
 */

interface GeoCheckResult {
  isNepal: boolean;
  method: 'ip' | 'timezone' | 'cached';
  confidence: 'high' | 'medium' | 'low';
  country?: string;
}

let cachedResult: GeoCheckResult | null = null;

/**
 * Check if the user is accessing from Nepal.
 * Results are cached for the browser session.
 */
export async function isFromNepal(): Promise<GeoCheckResult> {
  // Return cached result if available
  if (cachedResult) {
    return { ...cachedResult, method: 'cached' };
  }

  // Try IP geolocation first
  try {
    const result = await checkByIP();
    cachedResult = result;
    return result;
  } catch {
    // Fallback to timezone check
    const result = checkByTimezone();
    cachedResult = result;
    return result;
  }
}

/**
 * Check via IP geolocation API (ip-api.com — free, no key needed, 45 req/min)
 */
async function checkByIP(): Promise<GeoCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('http://ip-api.com/json/?fields=status,countryCode,country', {
      signal: controller.signal,
    });

    if (!res.ok) throw new Error('API error');

    const data = await res.json();
    clearTimeout(timeout);

    if (data.status !== 'success') throw new Error('API returned failure');

    return {
      isNepal: data.countryCode === 'NP',
      method: 'ip',
      confidence: 'high',
      country: data.country,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback: Check timezone.
 * Nepal is UTC+5:45 (offset = -345 minutes) with timezone "Asia/Kathmandu"
 * Less reliable (VPN users can change timezone), so confidence is "medium"
 */
function checkByTimezone(): GeoCheckResult {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().getTimezoneOffset();

  // Nepal: timezone "Asia/Kathmandu", offset -345 (UTC+5:45)
  const isNepalTimezone = timezone === 'Asia/Kathmandu' || offset === -345;

  return {
    isNepal: isNepalTimezone,
    method: 'timezone',
    confidence: isNepalTimezone ? 'medium' : 'low',
  };
}

/**
 * Clear the cached geo-check result (for testing or session refresh)
 */
export function clearGeoCache(): void {
  cachedResult = null;
}
