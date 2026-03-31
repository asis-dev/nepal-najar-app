import { getSupabase } from '@/lib/supabase/server';

export type ComplaintNotificationType =
  | 'complaint_assigned'
  | 'complaint_status'
  | 'complaint_escalated'
  | 'complaint_resolved'
  | 'complaint_sla_breach'
  | 'complaint_update';

interface ComplaintNotificationInput {
  complaintId: string;
  actorUserId?: string | null;
  type: ComplaintNotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
  includeOwner?: boolean;
  includeFollowers?: boolean;
  extraRecipients?: string[];
}

export async function notifyComplaintUsers({
  complaintId,
  actorUserId = null,
  type,
  title,
  body = null,
  link,
  metadata = {},
  includeOwner = true,
  includeFollowers = true,
  extraRecipients = [],
}: ComplaintNotificationInput): Promise<number> {
  const db = getSupabase();
  const recipients = new Set<string>(extraRecipients.filter(Boolean));

  if (includeOwner) {
    const { data: complaint } = await db
      .from('civic_complaints')
      .select('user_id')
      .eq('id', complaintId)
      .maybeSingle();
    if (complaint?.user_id) recipients.add(complaint.user_id as string);
  }

  if (includeFollowers) {
    const { data: followers } = await db
      .from('complaint_followers')
      .select('user_id')
      .eq('complaint_id', complaintId);
    for (const follower of followers || []) {
      if (follower.user_id) recipients.add(follower.user_id as string);
    }
  }

  if (actorUserId) recipients.delete(actorUserId);
  if (recipients.size === 0) return 0;

  const linkValue = link || `/complaints/${complaintId}`;
  const rows = Array.from(recipients).map((userId) => ({
    user_id: userId,
    type,
    title,
    body,
    link: linkValue,
    metadata: {
      complaint_id: complaintId,
      ...metadata,
    },
  }));

  const { error } = await db.from('user_notifications').insert(rows);
  if (error) {
    console.warn('[complaints] failed to insert notifications:', error.message);
    return 0;
  }
  return rows.length;
}
