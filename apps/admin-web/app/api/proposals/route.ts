/**
 * /api/proposals — Community Proposals (Janata Ko Maag)
 *
 * GET  ?province=X&district=Y&category=Z&status=open&sort=trending&page=1&limit=20
 *      → paginated list of proposals with author profiles
 * POST { title, description, category, province, ... }
 *      → create a new proposal (auth required, rate limited 3/day)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, createSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeEqToken } from '@/lib/supabase/filter-utils';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

const ALLOWED_CATEGORIES = [
  'infrastructure',
  'health',
  'education',
  'environment',
  'transport',
  'technology',
  'water_sanitation',
  'agriculture',
  'tourism',
  'governance',
  'social',
  'energy',
  'other',
] as const;

const ALLOWED_SORT = ['trending', 'newest', 'top'] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province');
  const district = searchParams.get('district');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const sort = (searchParams.get('sort') ?? 'trending') as (typeof ALLOWED_SORT)[number];
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const db = getSupabase();

  // Get current user ID if logged in (to show their own drafts)
  let currentUserId: string | null = null;
  try {
    const ssrClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch {
    // Not logged in
  }

  let query = db
    .from('community_proposals')
    .select(
      'id, title, title_ne, description, category, status, province, district, municipality, upvote_count, downvote_count, comment_count, trending_score, created_at, updated_at, author_id, image_urls, estimated_cost_npr, profiles(display_name, avatar_url)',
      { count: 'exact' }
    )
    .eq('is_hidden', false);

  // Filter out drafts unless they belong to the current user
  if (currentUserId) {
    const userToken = sanitizeEqToken(currentUserId);
    if (userToken) {
      query = query.or(`status.neq.draft,author_id.eq.${userToken}`);
    } else {
      query = query.neq('status', 'draft');
    }
  } else {
    query = query.neq('status', 'draft');
  }

  if (province) query = query.eq('province', province);
  if (district) query = query.eq('district', district);
  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);

  // Sort
  if (sort === 'trending') {
    query = query.order('trending_score', { ascending: false }).order('created_at', { ascending: false });
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'top') {
    // Sort by net votes (upvote_count - downvote_count) — use upvote_count as primary
    query = query.order('upvote_count', { ascending: false }).order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals = (data ?? []).map((p: any) => ({
    ...p,
    author_display_name:
      (p.profiles as unknown as { display_name: string })?.display_name ?? 'Anonymous',
    author_avatar_url:
      (p.profiles as unknown as { avatar_url: string })?.avatar_url ?? null,
    profiles: undefined,
  }));

  return NextResponse.json({
    proposals,
    page,
    limit,
    total: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  // Rate limit: 10/min per IP
  const ip = getClientIp(request);
  const { success: rateLimitOk } = await rateLimit(`proposals:${ip}`, 10, 60000);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    );
  }

  // Auth required
  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await ssrClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: {
    title?: string;
    title_ne?: string;
    description?: string;
    description_ne?: string;
    category?: string;
    province?: string;
    district?: string;
    municipality?: string;
    related_promise_ids?: string[];
    estimated_cost_npr?: number;
    image_urls?: string[];
    status?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, title_ne, description, description_ne, category, province, district, municipality, related_promise_ids, estimated_cost_npr, image_urls } = body;

  // Validate required fields
  if (!title || title.trim().length < 5 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Title must be 5-200 characters' }, { status: 400 });
  }

  if (!description || description.trim().length < 20 || description.trim().length > 5000) {
    return NextResponse.json({ error: 'Description must be 20-5000 characters' }, { status: 400 });
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    return NextResponse.json(
      { error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!province) {
    return NextResponse.json({ error: 'Province is required' }, { status: 400 });
  }

  const db = getSupabase();

  // Rate limit: max 3 proposals per user per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount, error: countError } = await db
    .from('community_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', user.id)
    .gte('created_at', todayStart.toISOString());

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((todayCount ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'You can create at most 3 proposals per day' },
      { status: 429 }
    );
  }

  const proposalStatus = body.status === 'draft' ? 'draft' : 'open';

  const { data, error } = await db
    .from('community_proposals')
    .insert({
      author_id: user.id,
      title: title.trim(),
      title_ne: title_ne?.trim() ?? null,
      description: description.trim(),
      description_ne: description_ne?.trim() ?? null,
      category,
      status: proposalStatus,
      province,
      district: district ?? null,
      municipality: municipality ?? null,
      related_promise_ids: related_promise_ids ?? [],
      estimated_cost_npr: estimated_cost_npr ?? null,
      image_urls: image_urls ?? [],
      upvote_count: 0,
      downvote_count: 0,
      comment_count: 0,
      flag_count: 0,
      is_flagged: false,
      is_hidden: false,
      trending_score: 0,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment user's proposals_created count (non-critical)
  try {
    await db.rpc('increment_field', {
      table_name: 'profiles',
      field_name: 'proposals_created',
      row_id: user.id,
    });
  } catch {
    // RPC may not exist yet — ignore
  }

  return NextResponse.json({ success: true, proposal: data }, { status: 201 });
}
