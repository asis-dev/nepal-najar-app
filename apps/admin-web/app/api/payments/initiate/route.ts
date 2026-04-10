/**
 * POST /api/payments/initiate
 *
 * Initiates a payment through eSewa or Khalti.
 * Body: { gateway: 'esewa' | 'khalti', serviceSlug, serviceTitle, amount, serviceTaskId?, approvalConfirmed? }
 *
 * Environment variables required:
 *  - ESEWA_MERCHANT_CODE   (test: EPAYTEST)
 *  - ESEWA_SECRET_KEY      (test: 8gBm/:&EnhH.1/q)
 *  - KHALTI_SECRET_KEY     (live secret key from Khalti dashboard)
 *  - KHALTI_TEST_SECRET_KEY (test secret key, optional)
 *  - NEXT_PUBLIC_BASE_URL  (e.g. https://nepalrepublic.org)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createOrUpdatePaymentIntegration,
  findTaskForPayment,
} from '@/lib/integrations/payment-task-bridge';
import { generateEsewaPaymentParams } from '@/lib/integrations/esewa';
import { initiateKhaltiPayment } from '@/lib/integrations/khalti';
import { readStoredPaymentProfile } from '@/lib/services/payment-profile';
import { insertTaskEventBestEffort } from '@/lib/services/task-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function db() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nepalrepublic.org';

export async function POST(req: Request) {
  try {
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { gateway, serviceSlug, serviceTitle, amount, serviceTaskId, approvalConfirmed } = body as {
      gateway: 'esewa' | 'khalti';
      serviceSlug: string;
      serviceTitle: string;
      amount: number; // NPR integer
      serviceTaskId?: string;
      approvalConfirmed?: boolean;
    };

    if (!gateway || !serviceSlug || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['esewa', 'khalti'].includes(gateway)) {
      return NextResponse.json({ error: 'Invalid gateway' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Check payment profile for explicit approval requirement
    const { data: profileRow } = await authSupabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle();
    const paymentProfile = readStoredPaymentProfile(
      (profileRow?.preferences as Record<string, unknown> | null) ?? {},
    );

    if (paymentProfile?.requireExplicitApproval !== false && approvalConfirmed !== true) {
      return NextResponse.json(
        { error: 'Human approval is required before launching this payment.' },
        { status: 400 },
      );
    }

    const transactionId = crypto.randomUUID();
    const linkedTask = await findTaskForPayment(db(), user.id, serviceSlug, serviceTaskId || null);

    // Store pending payment record
    const { data: paymentRow, error: dbErr } = await db().from('payments').insert({
      owner_id: user.id,
      service_slug: serviceSlug,
      service_title: serviceTitle || serviceSlug,
      service_task_id: linkedTask?.id || null,
      gateway,
      amount_npr: amount,
      transaction_id: transactionId,
      status: 'pending',
    }).select('*').single();

    if (dbErr) {
      console.error('[payments] DB insert error:', dbErr);
      // Continue even if DB insert fails — we can reconcile later
    }

    // Record integration + task event for the pending payment
    if (paymentRow && linkedTask) {
      await createOrUpdatePaymentIntegration(db(), {
        serviceTaskId: linkedTask.id,
        ownerId: user.id,
        providerKey: gateway,
        operation: 'payment',
        status: 'pending',
        paymentId: paymentRow.id,
        requestPayload: {
          gateway,
          serviceSlug,
          serviceTitle,
          amount,
          transactionId,
          approvalConfirmed: approvalConfirmed === true,
        },
      });

      await insertTaskEventBestEffort(db(), {
        task_id: linkedTask.id,
        owner_id: user.id,
        event_type: 'payment_initiated',
        note: `Payment initiated via ${gateway} for NPR ${amount}`,
        meta: {
          gateway,
          amount,
          transactionId,
        },
      });
    }

    // ── eSewa ─────────────────────────────────────────────────────────
    if (gateway === 'esewa') {
      const result = generateEsewaPaymentParams(transactionId, amount, BASE_URL, {
        serviceSlug,
        serviceTaskId: linkedTask?.id || null,
      });

      // Update integration status to redirected
      if (paymentRow && linkedTask) {
        await createOrUpdatePaymentIntegration(db(), {
          serviceTaskId: linkedTask.id,
          ownerId: user.id,
          providerKey: 'esewa',
          operation: 'payment',
          status: 'redirected',
          paymentId: paymentRow.id,
          requestPayload: result.formParams as unknown as Record<string, unknown>,
        });
      }

      return NextResponse.json({
        gateway: 'esewa',
        formUrl: result.formUrl,
        formParams: result.formParams,
        transactionId,
      });
    }

    // ── Khalti ────────────────────────────────────────────────────────
    try {
      const result = await initiateKhaltiPayment(
        transactionId,
        amount,
        serviceTitle || serviceSlug,
        BASE_URL,
        {
          serviceSlug,
          serviceTaskId: linkedTask?.id || null,
          customerEmail: user.email || undefined,
        },
      );

      // Store Khalti pidx on the payment record
      if (result.pidx) {
        await db()
          .from('payments')
          .update({ gateway_ref: result.pidx })
          .eq('transaction_id', transactionId);

        if (linkedTask && paymentRow) {
          await createOrUpdatePaymentIntegration(db(), {
            serviceTaskId: linkedTask.id,
            ownerId: user.id,
            providerKey: 'khalti',
            operation: 'payment',
            status: 'redirected',
            paymentId: paymentRow.id,
            providerReference: result.pidx,
            responsePayload: {
              pidx: result.pidx,
              payment_url: result.paymentUrl,
              expires_at: result.expiresAt,
            },
          });
        }
      }

      return NextResponse.json({
        gateway: 'khalti',
        paymentUrl: result.paymentUrl,
        pidx: result.pidx,
        transactionId,
      });
    } catch (khaltiErr: any) {
      console.error('[payments] Khalti initiation error:', khaltiErr);
      return NextResponse.json(
        { error: khaltiErr.message || 'Khalti initiation failed' },
        { status: 502 },
      );
    }
  } catch (err: any) {
    console.error('[payments] initiate error:', err);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}
