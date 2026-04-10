import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendTaskEmailToGovt, canSendEmailBridge } from '@/lib/integrations/email-bridge';
import { recordUserActivityBestEffort } from '@/lib/activity/activity-log';

export const runtime = 'nodejs';

/**
 * POST /api/me/service-tasks/[id]/send-to-govt
 *
 * Manually trigger sending a service task to the responsible government
 * office via the email bridge. Requires auth — task owner only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch task — must belong to the authenticated user
  const { data: task, error: taskError } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (taskError) {
    console.error('[send-to-govt] task lookup error:', taskError.message);
    return NextResponse.json({ error: 'Failed to look up task' }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: 'Task not found or not owned by you' }, { status: 404 });
  }

  // Check if email bridge is available for this service
  const check = canSendEmailBridge(task.service_slug);
  if (!check.canSend) {
    return NextResponse.json(
      {
        error: 'Email bridge not available for this service',
        reason: check.reason,
        officeName: check.officeName,
      },
      { status: 422 },
    );
  }

  // Send the email
  const result = await sendTaskEmailToGovt(supabase, task);

  if (!result.sent) {
    return NextResponse.json(
      {
        sent: false,
        error: result.error,
        sentTo: result.sentTo,
      },
      { status: 502 },
    );
  }

  // Log activity
  await recordUserActivityBestEffort(supabase, {
    owner_id: user.id,
    event_type: 'service_task_emailed_to_govt',
    entity_type: 'service_task',
    entity_id: task.id,
    title: `Sent ${task.service_title} to government office`,
    summary: `Emailed to ${result.sentTo}`,
    meta: {
      service_slug: task.service_slug,
      sent_to: result.sentTo,
      reply_token: result.replyToken,
      message_id: result.messageId,
    },
  });

  return NextResponse.json({
    sent: true,
    sentTo: result.sentTo,
    replyToken: result.replyToken,
    messageId: result.messageId,
  });
}
