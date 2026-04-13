/**
 * GET /api/payments/esewa/callback
 *
 * eSewa redirects here after payment (both success and failure).
 *
 * On success: eSewa sends a base64-encoded `data` query param containing the
 * signed transaction response. We decode it, verify the HMAC signature, update
 * the payment record, apply it to the linked service task, and redirect the
 * user to a success page.
 *
 * On failure: eSewa redirects with `status=failed`. We mark the payment as
 * failed and redirect the user to a failure page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyEsewaCallback } from '@/lib/integrations/esewa';
import {
  applyFailedPaymentToTask,
  applyVerifiedPaymentToTask,
  createOrUpdatePaymentIntegration,
  recordProviderEvent,
} from '@/lib/integrations/payment-task-bridge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function db() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nepalrepublic.org';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callbackStatus = searchParams.get('status'); // 'success' | 'failed'
  const dataParam = searchParams.get('data'); // base64 from eSewa on success
  const txnParam = searchParams.get('txn'); // our transaction UUID on failure
  const serviceSlug = searchParams.get('service') || '';
  const serviceTaskId = searchParams.get('task') || null;

  // ─── Failure path ───────────────────────────────────────────────────
  if (callbackStatus === 'failed' || !dataParam) {
    const transactionId = txnParam;

    if (transactionId) {
      const { data: paymentRow } = await db()
        .from('payments')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          ...(serviceTaskId ? { service_task_id: serviceTaskId } : {}),
        })
        .eq('transaction_id', transactionId)
        .select('*')
        .maybeSingle();

      if (paymentRow) {
        await applyFailedPaymentToTask(
          db(),
          paymentRow as any,
          'esewa',
          { txn: transactionId, serviceSlug, callbackStatus },
          'cancelled',
        );
      }
    }

    const params = new URLSearchParams({
      reason: 'cancelled',
      service: serviceSlug,
      ...(transactionId ? { txn: transactionId } : {}),
    });

    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/cases/${serviceTaskId}?payment=failed`,
      );
    }

    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?${params.toString()}`,
    );
  }

  // ─── Success path ──────────────────────────────────────────────────
  try {
    const result = verifyEsewaCallback(dataParam);

    // Update payment record in DB
    const paymentStatus = result.verified ? 'completed' : 'failed';
    await db()
      .from('payments')
      .update({
        status: paymentStatus,
        gateway_ref: result.refId,
        gateway_response: result.rawData,
        completed_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
        ...(serviceTaskId ? { service_task_id: serviceTaskId } : {}),
      })
      .eq('transaction_id', result.transactionId);

    // Fetch the full payment row for the bridge
    const { data: paymentRow } = await db()
      .from('payments')
      .select('*')
      .eq('transaction_id', result.transactionId)
      .maybeSingle();

    if (paymentRow) {
      if (result.verified) {
        await applyVerifiedPaymentToTask(
          db(),
          paymentRow as any,
          'esewa',
          result.rawData,
        );
      } else {
        await applyFailedPaymentToTask(
          db(),
          paymentRow as any,
          'esewa',
          result.rawData,
          'signature_mismatch',
        );
      }
    }

    // Record raw provider event for audit trail
    await recordProviderEvent(db(), {
      providerKey: 'esewa',
      eventType: result.verified ? 'callback_success' : 'callback_signature_fail',
      providerReference: result.refId,
      transactionId: result.transactionId,
      verified: result.verified,
      rawPayload: result.rawData as Record<string, unknown>,
      serviceTaskId: serviceTaskId || paymentRow?.service_task_id || null,
      paymentId: paymentRow?.id || null,
    });

    if (result.verified) {
      // Redirect to task page if we have a task ID, otherwise generic success
      if (serviceTaskId) {
        return NextResponse.redirect(
          `${BASE_URL}/me/cases/${serviceTaskId}?payment=success`,
        );
      }

      const params = new URLSearchParams({
        txn: result.transactionId,
        amount: result.totalAmount,
        gateway: 'esewa',
        service: serviceSlug,
      });
      return NextResponse.redirect(
        `${BASE_URL}/payments/success?${params.toString()}`,
      );
    }

    // Signature did not verify
    console.error('[esewa] Signature verification failed for txn:', result.transactionId);

    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/cases/${serviceTaskId}?payment=failed`,
      );
    }

    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?reason=signature_mismatch&service=${serviceSlug}`,
    );
  } catch (err: any) {
    console.error('[esewa] callback error:', err);

    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/cases/${serviceTaskId}?payment=failed`,
      );
    }

    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?reason=parse_error&service=${serviceSlug}`,
    );
  }
}
