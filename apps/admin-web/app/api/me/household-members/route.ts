import { NextRequest, NextResponse } from 'next/server';
import type { HouseholdRelationship } from '@/lib/household/types';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';
import { getRequestUser } from '@/lib/auth/request-user';

const ALLOWED_RELATIONSHIPS: HouseholdRelationship[] = [
  'self',
  'parent',
  'child',
  'spouse',
  'sibling',
  'relative',
  'other',
];

function normalizeString(value: unknown, maxLen = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

async function getAuthedContext(request: Request) {
  return getRequestUser(request);
}

function mapMemberRow(row: any) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    displayName: row.display_name,
    relationship: row.relationship,
    dateOfBirth: row.date_of_birth || null,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthedContext(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ members: (data || []).map(mapMemberRow) });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedContext(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const displayName = normalizeString(body.displayName, 120);
  const relationship =
    typeof body.relationship === 'string' &&
    ALLOWED_RELATIONSHIPS.includes(body.relationship as HouseholdRelationship)
      ? (body.relationship as HouseholdRelationship)
      : null;
  const dateOfBirth = normalizeString(body.dateOfBirth, 32);
  const notes = normalizeString(body.notes, 500);

  if (!displayName) {
    return NextResponse.json({ error: 'displayName required' }, { status: 400 });
  }
  if (!relationship) {
    return NextResponse.json({ error: 'relationship required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('household_members')
    .insert({
      owner_id: user.id,
      display_name: displayName,
      relationship,
      date_of_birth: dateOfBirth,
      notes,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'household_member_created',
    entity_type: 'household_member',
    entity_id: data.id,
    title: `Added ${data.display_name}`,
    summary: `Relationship: ${data.relationship}`,
    meta: {
      relationship: data.relationship,
      target_name: data.display_name,
    },
  });

  return NextResponse.json({ member: mapMemberRow(data) });
}
