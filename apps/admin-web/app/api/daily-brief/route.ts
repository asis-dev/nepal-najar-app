import { NextResponse } from 'next/server';
import { getDailyBrief, generateDailyBrief } from '@/lib/intelligence/daily-brief';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * GET /api/daily-brief
 * GET /api/daily-brief?date=2026-03-24
 *
 * Returns the daily brief for today (or specified date).
 * If not yet generated, generates it on the fly and caches.
 * Public — no auth required.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;

  try {
    // Try cached brief first
    let brief = await withTimeout(getDailyBrief(date), 5000, null);

    if (!brief) {
      // No cached brief — generate on the fly (only for today)
      if (!date || date === new Date().toISOString().slice(0, 10)) {
        brief = await withTimeout(generateDailyBrief(), 60000, null);
      }
    }

    if (!brief) {
      return NextResponse.json(
        { error: 'No brief available for this date', date: date || new Date().toISOString().slice(0, 10) },
        { status: 404 },
      );
    }

    return NextResponse.json(brief, {
      headers: {
        'Cache-Control': 'public, max-age=1800',
      },
    });
  } catch (err) {
    console.error('[API /daily-brief] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/daily-brief
 *
 * Force regenerate today's brief. Requires authentication.
 */
export async function POST() {
  try {
    // Check auth
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const brief = await generateDailyBrief();

    // Increment regenerated_count
    const { getSupabase } = await import('@/lib/supabase/server');
    const serviceClient = getSupabase();
    await serviceClient
      .from('daily_briefs')
      .update({ regenerated_count: brief.date ? 1 : 1 })
      .eq('date', brief.date);

    // Increment regen count — non-fatal
    try {
      await serviceClient.rpc('increment_brief_regen_count', { brief_date: brief.date });
    } catch {
      // RPC may not exist — non-fatal
    }

    return NextResponse.json({
      ...brief,
      regenerated: true,
    });
  } catch (err) {
    console.error('[API /daily-brief POST] Error:', err);
    return NextResponse.json(
      { error: 'Failed to regenerate daily brief' },
      { status: 500 },
    );
  }
}
