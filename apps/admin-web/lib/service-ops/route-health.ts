import { getSupabase } from '@/lib/supabase/server';

type RouteRow = {
  id: string;
  service_slug: string;
  counterparty_id: string;
  sla_target_hours?: number | null;
  sla_warning_hours?: number | null;
  auto_follow_up?: boolean | null;
  follow_up_interval_hours?: number | null;
  escalation_policy?: string | null;
  submission_mode?: string | null;
  response_capture_mode?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TaskRow = {
  id: string;
  service_slug?: string | null;
  queue_state?: string | null;
  resolution_due_at?: string | null;
  updated_at?: string | null;
};

type TokenRow = {
  expires_at?: string | null;
  use_count?: number | null;
  max_uses?: number | null;
  is_revoked?: boolean | null;
};

const TERMINAL_QUEUE_STATES = new Set(['approved', 'rejected', 'resolved', 'closed']);

export type CounterpartyRouteHealth = {
  route_id: string;
  service_slug: string;
  open_tasks: number;
  breached_tasks: number;
  warning_tasks: number;
  follow_up_due_tasks: number;
  latest_task_update: string | null;
  health_state: 'healthy' | 'warning' | 'breached';
  sla_target_hours: number | null;
  sla_warning_hours: number | null;
  auto_follow_up: boolean;
  follow_up_interval_hours: number | null;
  escalation_policy: string | null;
  submission_mode: string | null;
  response_capture_mode: string | null;
  metadata: Record<string, unknown>;
};

export type CounterpartyTokenStats = {
  total: number;
  active: number;
  expired: number;
  exhausted: number;
  revoked: number;
};

export async function getCounterpartyRouteHealth(counterpartyId: string) {
  const db = getSupabase();
  const nowMs = Date.now();

  const [{ data: counterparty }, { data: routes }, { data: tokens }] = await Promise.all([
    db
      .from('service_counterparties')
      .select('id, department_key')
      .eq('id', counterpartyId)
      .maybeSingle(),
    db
      .from('service_counterparty_routes')
      .select('*')
      .eq('counterparty_id', counterpartyId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    db
      .from('service_partner_reply_tokens')
      .select('expires_at, use_count, max_uses, is_revoked')
      .eq('counterparty_id', counterpartyId),
  ]);

  if (!counterparty) {
    return {
      routeHealth: [] as CounterpartyRouteHealth[],
      summary: {
        total_routes: 0,
        healthy_routes: 0,
        warning_routes: 0,
        breached_routes: 0,
        total_open_tasks: 0,
        total_breached_tasks: 0,
        total_follow_up_due_tasks: 0,
      },
      tokenStats: {
        total: 0,
        active: 0,
        expired: 0,
        exhausted: 0,
        revoked: 0,
      } satisfies CounterpartyTokenStats,
    };
  }

  const routeRows = (routes || []) as RouteRow[];
  const serviceSlugs = Array.from(new Set(routeRows.map((route) => route.service_slug).filter(Boolean)));

  let taskRows: TaskRow[] = [];
  if (counterparty.department_key && serviceSlugs.length > 0) {
    const { data: tasks } = await db
      .from('service_tasks')
      .select('id, service_slug, queue_state, resolution_due_at, updated_at')
      .eq('assigned_department_key', counterparty.department_key)
      .in('service_slug', serviceSlugs)
      .order('updated_at', { ascending: false })
      .limit(2000);
    taskRows = (tasks || []) as TaskRow[];
  }

  const routeHealth = routeRows.map((route) => {
    const relatedTasks = taskRows.filter((task) => task.service_slug === route.service_slug);
    const openTasks = relatedTasks.filter((task) => !TERMINAL_QUEUE_STATES.has(task.queue_state || ''));

    const breachedTasks = openTasks.filter((task) => {
      if (!task.resolution_due_at) return false;
      const dueAt = new Date(task.resolution_due_at).getTime();
      return Number.isFinite(dueAt) && dueAt < nowMs;
    });

    const warningWindowMs =
      typeof route.sla_warning_hours === 'number' && route.sla_warning_hours > 0
        ? route.sla_warning_hours * 60 * 60 * 1000
        : null;

    const warningTasks = openTasks.filter((task) => {
      if (!task.resolution_due_at || !warningWindowMs) return false;
      const dueAt = new Date(task.resolution_due_at).getTime();
      if (!Number.isFinite(dueAt) || dueAt < nowMs) return false;
      return dueAt - nowMs <= warningWindowMs;
    });

    const followUpDueTasks = openTasks.filter((task) => {
      if (!route.auto_follow_up || !route.follow_up_interval_hours || !task.updated_at) return false;
      const updatedAt = new Date(task.updated_at).getTime();
      if (!Number.isFinite(updatedAt)) return false;
      return nowMs - updatedAt >= route.follow_up_interval_hours * 60 * 60 * 1000;
    });

    const latestTaskUpdate = relatedTasks[0]?.updated_at || null;
    const healthState =
      breachedTasks.length > 0 ? 'breached' : warningTasks.length > 0 || followUpDueTasks.length > 0 ? 'warning' : 'healthy';

    return {
      route_id: route.id,
      service_slug: route.service_slug,
      open_tasks: openTasks.length,
      breached_tasks: breachedTasks.length,
      warning_tasks: warningTasks.length,
      follow_up_due_tasks: followUpDueTasks.length,
      latest_task_update: latestTaskUpdate,
      health_state: healthState,
      sla_target_hours: route.sla_target_hours ?? null,
      sla_warning_hours: route.sla_warning_hours ?? null,
      auto_follow_up: Boolean(route.auto_follow_up),
      follow_up_interval_hours: route.follow_up_interval_hours ?? null,
      escalation_policy: route.escalation_policy ?? null,
      submission_mode: route.submission_mode ?? null,
      response_capture_mode: route.response_capture_mode ?? null,
      metadata: (route.metadata as Record<string, unknown>) || {},
    } satisfies CounterpartyRouteHealth;
  });

  const tokenRows = (tokens || []) as TokenRow[];
  const tokenStats: CounterpartyTokenStats = {
    total: tokenRows.length,
    active: tokenRows.filter((token) => {
      if (token.is_revoked) return false;
      const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return expiresAt >= nowMs && (token.use_count || 0) < (token.max_uses || 0);
    }).length,
    expired: tokenRows.filter((token) => {
      if (!token.expires_at) return false;
      const expiresAt = new Date(token.expires_at).getTime();
      return Number.isFinite(expiresAt) && expiresAt < nowMs;
    }).length,
    exhausted: tokenRows.filter((token) => (token.use_count || 0) >= (token.max_uses || 0)).length,
    revoked: tokenRows.filter((token) => Boolean(token.is_revoked)).length,
  };

  return {
    routeHealth,
    summary: {
      total_routes: routeHealth.length,
      healthy_routes: routeHealth.filter((route) => route.health_state === 'healthy').length,
      warning_routes: routeHealth.filter((route) => route.health_state === 'warning').length,
      breached_routes: routeHealth.filter((route) => route.health_state === 'breached').length,
      total_open_tasks: routeHealth.reduce((sum, route) => sum + route.open_tasks, 0),
      total_breached_tasks: routeHealth.reduce((sum, route) => sum + route.breached_tasks, 0),
      total_follow_up_due_tasks: routeHealth.reduce((sum, route) => sum + route.follow_up_due_tasks, 0),
    },
    tokenStats,
  };
}
