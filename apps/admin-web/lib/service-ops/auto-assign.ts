/**
 * Auto-assignment on task creation.
 *
 * When a service task is created and routed to a department:
 *  1. Look up assignable members in the department
 *  2. Pick the least-loaded staff member
 *  3. Create a service_task_assignments row
 *  4. Update the task with assigned_staff_user_id + queue_state = 'assigned'
 *  5. Notify department staff of the new task
 *
 * Designed to be fire-and-forget — failures are logged but never block task creation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAssignableMembers, chooseLeastLoadedServiceAssignee } from './queue';
import { notifyServiceTaskUsers, insertServiceTaskMessageBestEffort } from './notifications';
import { insertTaskEventBestEffort, updateServiceTaskWithCompatibility } from '@/lib/services/task-store';

interface AutoAssignInput {
  taskId: string;
  ownerId: string;
  departmentKey: string;
  departmentName: string;
  serviceSlug: string;
  serviceTitle: string;
}

interface AutoAssignResult {
  assigned: boolean;
  assigneeUserId: string | null;
  notified: boolean;
}

export async function autoAssignAndNotify(
  supabase: SupabaseClient,
  input: AutoAssignInput,
): Promise<AutoAssignResult> {
  const result: AutoAssignResult = {
    assigned: false,
    assigneeUserId: null,
    notified: false,
  };

  try {
    // 1. Find assignable members
    const members = await getAssignableMembers(input.departmentKey);
    const candidateIds = members.map((m: any) => m.user_id as string).filter(Boolean);

    if (candidateIds.length > 0) {
      // 2. Pick least-loaded
      const assigneeId = await chooseLeastLoadedServiceAssignee(input.departmentKey, candidateIds);

      if (assigneeId) {
        const now = new Date().toISOString();

        // 3. Create assignment row
        const { error: assignError } = await supabase
          .from('service_task_assignments')
          .insert({
            task_id: input.taskId,
            department_key: input.departmentKey,
            assignee_user_id: assigneeId,
            assigned_by: null, // system auto-assignment
            assignment_note: 'Auto-assigned to least-loaded staff member',
            is_active: true,
          });

        if (assignError) {
          const msg = (assignError.message || '').toLowerCase();
          if (!msg.includes('does not exist') && !msg.includes('schema cache')) {
            console.warn('[auto-assign] assignment insert failed:', assignError.message);
          }
        } else {
          // 4. Update task
          await updateServiceTaskWithCompatibility(supabase, input.taskId, {
            assigned_staff_user_id: assigneeId,
            queue_state: 'assigned',
            first_staff_response_at: now,
          });

          result.assigned = true;
          result.assigneeUserId = assigneeId;

          await insertTaskEventBestEffort(supabase, {
            task_id: input.taskId,
            owner_id: input.ownerId,
            event_type: 'task_auto_assigned',
            note: `Auto-assigned to staff in ${input.departmentName}`,
            meta: {
              department_key: input.departmentKey,
              assignee_user_id: assigneeId,
            },
          });

          // 5a. Notify assigned staff
          const notifyCount = await notifyServiceTaskUsers(supabase, {
            taskId: input.taskId,
            ownerId: input.ownerId,
            title: `New case: ${input.serviceTitle}`,
            body: `A new ${input.serviceTitle} case has been assigned to you.`,
            link: `/service-ops`,
            metadata: {
              service_slug: input.serviceSlug,
              department_key: input.departmentKey,
              action: 'auto_assigned',
            },
            includeOwner: false,
            includeAssignedStaff: true,
            includeDepartmentMembers: false,
            assignedStaffUserId: assigneeId,
            departmentKey: input.departmentKey,
          });

          result.notified = notifyCount > 0;
        }
      }
    }

    // 5b. Even if no auto-assignment, notify department members about the new task
    if (!result.assigned) {
      const notifyCount = await notifyServiceTaskUsers(supabase, {
        taskId: input.taskId,
        ownerId: input.ownerId,
        title: `New case: ${input.serviceTitle}`,
        body: `A new ${input.serviceTitle} case is waiting in the ${input.departmentName} queue.`,
        link: `/service-ops`,
        metadata: {
          service_slug: input.serviceSlug,
          department_key: input.departmentKey,
          action: 'new_unassigned',
        },
        includeOwner: false,
        includeAssignedStaff: false,
        includeDepartmentMembers: true,
        departmentKey: input.departmentKey,
      });

      result.notified = notifyCount > 0;
    }

    // Insert system message on the task timeline
    await insertServiceTaskMessageBestEffort(supabase, {
      taskId: input.taskId,
      ownerId: input.ownerId,
      actorType: 'system',
      visibility: 'internal',
      messageType: 'system',
      body: result.assigned
        ? `Task auto-assigned to staff in ${input.departmentName}.`
        : `Task routed to ${input.departmentName} queue. Awaiting staff pickup.`,
      metadata: {
        department_key: input.departmentKey,
        assigned: result.assigned,
        assignee_user_id: result.assigneeUserId,
      },
    });
  } catch (err: any) {
    console.warn('[auto-assign] failed (non-blocking):', err?.message || err);
  }

  return result;
}
