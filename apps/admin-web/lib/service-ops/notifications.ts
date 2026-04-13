import type { SupabaseClient } from '@supabase/supabase-js';

function isMissingRelation(message?: string, relation?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (relation && !normalized.includes(relation.toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('relation') ||
    normalized.includes('schema cache')
  );
}

type NotifyServiceTaskUsersInput = {
  taskId: string;
  actorUserId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
  includeOwner?: boolean;
  includeAssignedStaff?: boolean;
  includeDepartmentMembers?: boolean;
  extraRecipients?: string[];
  ownerId?: string | null;
  assignedStaffUserId?: string | null;
  departmentKey?: string | null;
};

type InsertServiceTaskMessageInput = {
  taskId: string;
  ownerId: string;
  actorId?: string | null;
  actorType: 'citizen' | 'department' | 'admin' | 'system' | 'provider';
  visibility?: 'public' | 'internal';
  messageType?: 'note' | 'request_info' | 'status_update' | 'decision' | 'system';
  body: string;
  metadata?: Record<string, unknown>;
};

export async function notifyServiceTaskUsers(
  supabase: SupabaseClient,
  {
    taskId,
    actorUserId = null,
    title,
    body = null,
    link,
    metadata = {},
    includeOwner = true,
    includeAssignedStaff = false,
    includeDepartmentMembers = false,
    extraRecipients = [],
    ownerId,
    assignedStaffUserId,
    departmentKey,
  }: NotifyServiceTaskUsersInput,
) {
  let resolvedOwnerId = ownerId || null;
  let resolvedAssignedStaff = assignedStaffUserId || null;
  let resolvedDepartmentKey = departmentKey || null;

  if (!resolvedOwnerId || (!resolvedAssignedStaff && !resolvedDepartmentKey)) {
    const { data: task, error } = await supabase
      .from('service_tasks')
      .select('owner_id, assigned_staff_user_id, assigned_department_key')
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      if (isMissingRelation(error.message, 'service_tasks')) return 0;
      console.warn('[service-ops] failed to resolve task recipients:', error.message);
      return 0;
    }

    resolvedOwnerId = resolvedOwnerId || (task?.owner_id as string | null) || null;
    resolvedAssignedStaff =
      resolvedAssignedStaff || (task?.assigned_staff_user_id as string | null) || null;
    resolvedDepartmentKey =
      resolvedDepartmentKey || (task?.assigned_department_key as string | null) || null;
  }

  const recipients = new Set<string>(extraRecipients.filter(Boolean));

  if (includeOwner && resolvedOwnerId) recipients.add(resolvedOwnerId);
  if (includeAssignedStaff && resolvedAssignedStaff) recipients.add(resolvedAssignedStaff);

  if (includeDepartmentMembers && resolvedDepartmentKey) {
    const { data: members, error } = await supabase
      .from('service_department_members')
      .select('user_id')
      .eq('department_key', resolvedDepartmentKey)
      .eq('is_active', true);

    if (error) {
      if (!isMissingRelation(error.message, 'service_department_members')) {
        console.warn('[service-ops] failed to load department members:', error.message);
      }
    } else {
      for (const member of members || []) {
        if (member.user_id) recipients.add(member.user_id as string);
      }
    }
  }

  if (actorUserId) recipients.delete(actorUserId);
  if (recipients.size === 0) return 0;

  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    type: 'system',
    title,
    body,
    link: link || `/me/cases`,
    metadata: {
      service_task_id: taskId,
      kind: 'service_task',
      ...metadata,
    },
  }));

  const { error } = await supabase.from('user_notifications').insert(rows);
  if (error) {
    if (isMissingRelation(error.message, 'user_notifications')) return 0;
    console.warn('[service-ops] failed to insert notifications:', error.message);
    return 0;
  }

  return rows.length;
}

export async function insertServiceTaskMessageBestEffort(
  supabase: SupabaseClient,
  {
    taskId,
    ownerId,
    actorId = null,
    actorType,
    visibility = 'public',
    messageType = 'system',
    body,
    metadata = {},
  }: InsertServiceTaskMessageInput,
) {
  const { error } = await supabase.from('service_task_messages').insert({
    task_id: taskId,
    owner_id: ownerId,
    actor_id: actorId,
    actor_type: actorType,
    visibility,
    message_type: messageType,
    body,
    metadata,
  });

  if (error) {
    if (isMissingRelation(error.message, 'service_task_messages')) return false;
    console.warn('[service-ops] failed to insert service task message:', error.message);
    return false;
  }

  return true;
}
