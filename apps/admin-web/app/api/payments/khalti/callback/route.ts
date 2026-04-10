/**
 * GET /api/payments/khalti/callback
 *
 * Khalti redirects here after payment with pidx, transaction_id, purchase_order_id,
 * amount, etc. as query params.
 *
 * We call Khalti's lookup API to verify the payment status, update the payment
 * record, apply it to the linked service task, and redirect the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyKhaltiPayment } from '@/lib/integrations/khalti';
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
  const pidx = searchParams.get('pidx');
  const serviceSlug = searchParams.get('service') || '';
  const purchaseOrderId =
    searchParams.get('purchase_order_id') ||
    searchParams.get('transaction_id') ||
    '';
  const serviceTaskId = searchParams.get('task') || null;

  if (!pidx) {
    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/tasks/${serviceTaskId}?payment=failed`,
      );
    }
    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?reason=missing_pidx&service=${serviceSlug}`,
    );
  }

  try {
    const result = await verifyKhaltiPayment(pidx);
    const transactionId = result.purchaseOrderId || purchaseOrderId;

    const dbUpdates = {
      status: result.verified ? 'completed' : 'failed',
      gateway_ref: pidx,
      gateway_response: result.rawData as unknown as Record<string, unknown>,
      completed_at: result.verified ? new Date().toISOString() : null,
      ...(serviceTaskId ? { service_task_id: serviceTaskId } : {}),
    };

    // Update payment in DB and fetch the full row
    let paymentRow: any = null;
    if (transactionId) {
      const paymentQuery = await db()
        .from('payments')
        .update(dbUpdates)
        .eq('transaction_id', transactionId)
        .select('*')
        .maybeSingle();

      paymentRow = paymentQuery.data;
    }

    // If we couldn't find by transaction_id, try by gateway_ref (pidx)
    if (!paymentRow) {
      const fallbackQuery = await db()
        .from('payments')
        .update(dbUpdates)
        .eq('gateway_ref', pidx)
        .select('*')
        .maybeSingle();

      paymentRow = fallbackQuery.data;
    }

    // Apply to service task via the bridge
    if (paymentRow) {
      if (result.verified) {
        await applyVerifiedPaymentToTask(
          db(),
          paymentRow,
          'khalti',
          result.rawData as unknown as Record<string, unknown>,
        );
      } else {
        await applyFailedPaymentToTask(
          db(),
          paymentRow,
          'khalti',
          result.rawData as unknown as Record<string, unknown>,
          'payment_not_complete',
        );
      }
    }

    // Update integration record if task is linked
    const effectiveTaskId = serviceTaskId || paymentRow?.service_task_id;
    if (effectiveTaskId) {
      await createOrUpdatePaymentIntegration(db(), {
        serviceTaskId: effectiveTaskId,
        ownerId: paymentRow?.owner_id || null,
        providerKey: 'khalti',
        operation: 'payment',
        status: result.verified ? 'verified' : 'failed',
        paymentId: paymentRow?.id || null,
        providerReference: pidx,
        responsePayload: result.rawData as unknown as Record<string, unknown>,
        receiptNumber: result.verified ? result.transactionId : null,
        errorCode: result.verified ? null : result.status,
        errorMessage: result.verified ? null : `Payment status: ${result.status}`,
      });
    }

    // Record provider event for audit trail
    await recordProviderEvent(db(), {
      providerKey: 'khalti',
      eventType: result.verified ? 'callback_verified' : 'callback_not_verified',
      providerReference: pidx,
      transactionId: result.transactionId || transactionId,
      verified: result.verified,
      rawPayload: result.rawData as unknown as Record<string, unknown>,
      serviceTaskId: effectiveTaskId || null,
      paymentId: paymentRow?.id || null,
    });

    if (result.verified) {
      if (serviceTaskId) {
        return NextResponse.redirect(
          `${BASE_URL}/me/tasks/${serviceTaskId}?payment=success`,
        );
      }

      const params = new URLSearchParams({
        txn: transactionId,
        amount: String(result.totalAmountNPR),
        gateway: 'khalti',
        service: serviceSlug,
      });
      return NextResponse.redirect(
        `${BASE_URL}/payments/success?${params.toString()}`,
      );
    }

    // Payment not complete
    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/tasks/${serviceTaskId}?payment=failed`,
      );
    }

    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?reason=payment_not_complete&service=${serviceSlug}`,
    );
  } catch (err: any) {
    console.error('[khalti] callback error:', err);

    if (serviceTaskId) {
      return NextResponse.redirect(
        `${BASE_URL}/me/tasks/${serviceTaskId}?payment=failed`,
      );
    }

    return NextResponse.redirect(
      `${BASE_URL}/payments/failure?reason=verify_error&service=${serviceSlug}`,
    );
  }
}
