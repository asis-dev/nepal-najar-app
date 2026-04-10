/**
 * GET /api/payments/khalti/verify
 *
 * Legacy Khalti verify callback — redirects to the canonical callback route.
 * Kept for backward compatibility with any in-flight payments using the old URL.
 */

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nepalrepublic.org';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Forward all params to the canonical callback route
  const params = new URLSearchParams();

  const pidx = searchParams.get('pidx');
  if (pidx) params.set('pidx', pidx);

  const service = searchParams.get('service');
  if (service) params.set('service', service);

  const task = searchParams.get('task');
  if (task) params.set('task', task);

  const purchaseOrderId = searchParams.get('purchase_order_id');
  if (purchaseOrderId) params.set('purchase_order_id', purchaseOrderId);

  const transactionId = searchParams.get('transaction_id');
  if (transactionId) params.set('transaction_id', transactionId);

  const amount = searchParams.get('amount');
  if (amount) params.set('amount', amount);

  return NextResponse.redirect(
    `${BASE_URL}/api/payments/khalti/callback?${params.toString()}`,
  );
}
