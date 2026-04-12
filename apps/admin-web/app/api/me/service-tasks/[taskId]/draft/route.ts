import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { generateDraft, loadDraft, storeDraft, updateDraftField, confirmDraftField } from '@/lib/services/form-drafter';

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found' }, { status: 404 });
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[draft GET] error:', err);
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  let body: { serviceSlug: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.serviceSlug) return NextResponse.json({ error: 'serviceSlug required' }, { status: 400 });

  try {
    const draft = await generateDraft(supabase, user.id, body.serviceSlug);
    await storeDraft(supabase, user.id, taskId, draft);
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[draft POST] error:', err);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  let body: { fieldKey: string; value?: string; confirm?: boolean };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    let draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found' }, { status: 404 });

    if (body.value !== undefined) {
      draft = updateDraftField(draft, body.fieldKey, body.value);
    }
    if (body.confirm) {
      draft = confirmDraftField(draft, body.fieldKey);
    }

    await storeDraft(supabase, user.id, taskId, draft);
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('[draft PATCH] error:', err);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}
