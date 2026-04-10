import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { getServiceAISummary } from '@/lib/service-ops/ai';

function canManagePlaybooks(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function GET(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const departmentKey = request.nextUrl.searchParams.get('department_key')?.trim() || null;
  const serviceSlug = request.nextUrl.searchParams.get('service_slug')?.trim() || null;
  if (departmentKey && !canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const db = getSupabase();
  let recentRunsQuery = db
    .from('service_task_ai_runs')
    .select('id, task_id, status, summary, created_at, completed_at, playbook:service_ai_playbooks(id, name, department_key)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (departmentKey) recentRunsQuery = recentRunsQuery.eq('department_key', departmentKey);
  if (!ctx.isElevated && ctx.departmentsScope && ctx.departmentsScope.length > 0) {
    recentRunsQuery = recentRunsQuery.in('department_key', ctx.departmentsScope);
  }

  let query = db
    .from('service_ai_playbooks')
    .select('*')
    .eq('is_active', true)
    .order('department_key', { ascending: true })
    .order('priority', { ascending: false });

  if (departmentKey) query = query.eq('department_key', departmentKey);
  if (!ctx.isElevated && ctx.departmentsScope && ctx.departmentsScope.length > 0) {
    query = query.in('department_key', ctx.departmentsScope);
  }
  if (serviceSlug) {
    query = query.or(`service_slug.eq.${serviceSlug},service_slug.is.null`);
  }

  if (!ctx.isElevated && (!ctx.departmentsScope || ctx.departmentsScope.length === 0)) {
    return NextResponse.json({ playbooks: [], summary: await getServiceAISummary() });
  }

  const [{ data, error }, { data: recentRuns }] = await Promise.all([
    query,
    recentRunsQuery,
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ordered = serviceSlug
    ? (data || []).sort((a: any, b: any) => {
        const aSpecific = a.service_slug === serviceSlug ? 1 : 0;
        const bSpecific = b.service_slug === serviceSlug ? 1 : 0;
        return bSpecific - aSpecific || (b.priority || 0) - (a.priority || 0);
      })
    : (data || []);

  return NextResponse.json({ playbooks: ordered, summary: await getServiceAISummary(), recent_runs: recentRuns || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const departmentKey = typeof body.department_key === 'string' ? body.department_key.trim() : '';
  const playbookKey = typeof body.playbook_key === 'string' ? body.playbook_key.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!departmentKey || !playbookKey || !name) {
    return NextResponse.json({ error: 'department_key, playbook_key, and name are required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, departmentKey) : null;
  if (!canManagePlaybooks(ctx, membership)) {
    return NextResponse.json({ error: 'AI playbook management permission required' }, { status: 403 });
  }

  const db = getSupabase();
  const payload = {
    department_key: departmentKey,
    service_slug: typeof body.service_slug === 'string' ? body.service_slug.trim() : null,
    playbook_key: playbookKey,
    name,
    description: typeof body.description === 'string' ? body.description.trim() : null,
    ai_role: typeof body.ai_role === 'string' ? body.ai_role.trim() : 'case_assistant',
    trigger_mode: typeof body.trigger_mode === 'string' ? body.trigger_mode.trim() : 'suggested',
    priority: typeof body.priority === 'number' ? body.priority : 100,
    objective: typeof body.objective === 'string' ? body.objective.trim() : null,
    allowed_tools: Array.isArray(body.allowed_tools) ? body.allowed_tools : [],
    requires_human_approval: body.requires_human_approval !== false,
    can_contact_citizen: Boolean(body.can_contact_citizen),
    can_contact_provider: Boolean(body.can_contact_provider),
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    is_active: body.is_active !== false,
  };

  const { data, error } = await db
    .from('service_ai_playbooks')
    .upsert(payload, { onConflict: 'department_key,playbook_key' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playbook: data });
}
