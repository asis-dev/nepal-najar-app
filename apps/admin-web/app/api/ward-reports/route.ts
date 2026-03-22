/**
 * /api/ward-reports — Ward-level citizen reports
 *
 * GET  ?province=...&district=...&topic=...  → list reports (with user profile join)
 * POST { province, district, topic, rating, description?, media_urls? }  → submit report (auth required)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, isSupabaseConfigured, createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province');
  const district = searchParams.get('district');
  const topic = searchParams.get('topic');
  const scorecard = searchParams.get('scorecard'); // "true" for aggregated view
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ reports: [], scorecard: [] });
  }

  const supabase = getSupabase();

  // Scorecard mode: return aggregated ratings by topic for an area
  if (scorecard === 'true') {
    if (!province) {
      return NextResponse.json({ error: 'province is required for scorecard' }, { status: 400 });
    }

    // Use raw query for aggregation
    const { data, error } = await supabase
      .from('ward_reports')
      .select('topic, rating')
      .eq('province', province)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by district if provided
    const filtered = district
      ? (data ?? []).filter((r: Record<string, unknown>) => r.district === district)
      : (data ?? []);

    // Aggregate by topic
    const topicMap: Record<string, { total: number; sum: number; count: number }> = {};
    for (const row of filtered) {
      const r = row as { topic: string; rating: number };
      if (!topicMap[r.topic]) {
        topicMap[r.topic] = { total: 0, sum: 0, count: 0 };
      }
      topicMap[r.topic].total++;
      topicMap[r.topic].sum += r.rating;
      topicMap[r.topic].count++;
    }

    const scorecardData = Object.entries(topicMap).map(([t, stats]) => ({
      topic: t,
      averageRating: Math.round((stats.sum / stats.count) * 10) / 10,
      reportCount: stats.total,
    }));

    return NextResponse.json({ scorecard: scorecardData });
  }

  // List mode: return individual reports
  let query = supabase
    .from('ward_reports')
    .select('*')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (province) query = query.eq('province', province);
  if (district) query = query.eq('district', district);
  if (topic) query = query.eq('topic', topic);

  const { data, error } = await query;

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ reports: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Join user display names from profiles
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r: Record<string, unknown>) => r.user_id as string))];

  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p: Record<string, unknown>) => [p.id as string, (p.display_name as string) || 'Anonymous'])
      );
    }
  }

  const reports = rows.map((r: Record<string, unknown>) => ({
    ...r,
    author_name: profileMap[r.user_id as string] || 'Anonymous',
  }));

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  // Rate limit: 10/min per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = rateLimit(`ward-reports:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Require authentication
  let userId: string;
  try {
    const ssrClient = await createSupabaseServerClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: {
    province?: string;
    district?: string;
    municipality?: string;
    ward_number?: string;
    topic?: string;
    rating?: number;
    description?: string;
    description_ne?: string;
    media_urls?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { province, district, topic, rating, description, description_ne, municipality, ward_number, media_urls } = body;

  // Validate required fields
  if (!province || !district || !topic || !rating) {
    return NextResponse.json(
      { error: 'province, district, topic, and rating are required' },
      { status: 400 }
    );
  }

  const validTopics = ['roads', 'water', 'electricity', 'health', 'education', 'sanitation', 'internet', 'safety', 'employment', 'other'];
  if (!validTopics.includes(topic)) {
    return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }

  if (description && description.length > 1000) {
    return NextResponse.json({ error: 'Description must be 1000 characters or less' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ward_reports')
    .insert({
      user_id: userId,
      province,
      district,
      municipality: municipality ?? null,
      ward_number: ward_number ?? null,
      topic,
      rating,
      description: description ?? null,
      description_ne: description_ne ?? null,
      media_urls: media_urls ?? [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Ward reports table not yet created' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data }, { status: 201 });
}
