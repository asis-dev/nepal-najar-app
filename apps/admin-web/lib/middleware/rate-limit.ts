/**
 * Rate limiter with optional distributed backend (Upstash REST).
 * Falls back to in-memory storage when external backend is not configured.
 */

type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

// Map of identifier -> { count, resetAt }
const store =
  (globalThis as { __npRateLimitStore?: Map<string, { count: number; resetAt: number }> })
    .__npRateLimitStore ||
  new Map<string, { count: number; resetAt: number }>();

if (!(globalThis as { __npRateLimitStore?: Map<string, { count: number; resetAt: number }> })
  .__npRateLimitStore) {
  (globalThis as { __npRateLimitStore?: Map<string, { count: number; resetAt: number }> })
    .__npRateLimitStore = store;
}

function memoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt };
}

async function distributedRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const key = `np:ratelimit:${identifier}`;
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, String(windowMs), 'NX'],
        ['PTTL', key],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as
      | Array<{ result?: unknown }>
      | { result?: Array<{ result?: unknown }> };
    const resultArray = Array.isArray(payload) ? payload : payload?.result;
    if (!Array.isArray(resultArray)) return null;

    const currentRaw = (resultArray[0] as { result?: unknown } | undefined)?.result;
    const ttlRaw = (resultArray[2] as { result?: unknown } | undefined)?.result;
    const current = Number(currentRaw);
    const ttlMs = Number(ttlRaw);

    if (!Number.isFinite(current)) return null;

    const effectiveTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs;
    const resetAt = Date.now() + effectiveTtl;
    const remaining = Math.max(0, limit - current);

    return {
      success: current <= limit,
      remaining,
      resetAt,
    };
  } catch {
    return null;
  }
}

export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const distributed = await distributedRateLimit(identifier, limit, windowMs);
  if (distributed) return distributed;
  return memoryRateLimit(identifier, limit, windowMs);
}

/** Helper to get client IP from Next.js request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
      if (now > val.resetAt) store.delete(key);
    }
  }, 60000);
}
