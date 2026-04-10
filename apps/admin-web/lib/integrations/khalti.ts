/**
 * Khalti ePay v2 Integration
 *
 * Handles payment initiation and verification for Khalti's redirect-based flow.
 *
 * Flow:
 *   1. Server calls `initiateKhaltiPayment()` → Khalti returns payment_url + pidx
 *   2. Client navigates to payment_url (browser redirect to Khalti checkout)
 *   3. Khalti redirects back to return_url with pidx, transaction_id, etc.
 *   4. Server calls `verifyKhaltiPayment(pidx)` to confirm status
 *
 * Env vars:
 *   KHALTI_SECRET_KEY       – live secret key from Khalti dashboard
 *   KHALTI_TEST_SECRET_KEY  – test/sandbox secret key (optional, used when NODE_ENV !== production)
 *
 * Docs: https://docs.khalti.com/
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === 'production';

const KHALTI_BASE = 'https://a.khalti.com';

function getSecretKey(): string | null {
  if (IS_PROD) {
    return process.env.KHALTI_SECRET_KEY || null;
  }
  // In test/dev, prefer test key, fall back to live key
  return process.env.KHALTI_TEST_SECRET_KEY || process.env.KHALTI_SECRET_KEY || null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KhaltiInitiateRequest {
  return_url: string;
  website_url: string;
  amount: number; // in paisa (1 NPR = 100 paisa)
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number; // in paisa
  status: 'Completed' | 'Pending' | 'Initiated' | 'Refunded' | 'Partially Refunded' | 'Expired' | 'User canceled';
  transaction_id: string;
  fee: number;
  refunded: boolean;
  purchase_order_id: string;
  purchase_order_name: string;
  extra_merchant_params?: Record<string, unknown>;
}

export interface KhaltiPaymentResult {
  paymentUrl: string;
  pidx: string;
  expiresAt: string;
}

export interface KhaltiVerificationResult {
  verified: boolean;
  pidx: string;
  status: string;
  transactionId: string;
  purchaseOrderId: string;
  totalAmountPaisa: number;
  totalAmountNPR: number;
  fee: number;
  rawData: KhaltiLookupResponse;
}

// ---------------------------------------------------------------------------
// Initiation
// ---------------------------------------------------------------------------

/**
 * Initiate a Khalti payment session.
 *
 * @param transactionId  Our internal transaction/order ID (used as purchase_order_id)
 * @param amountNPR      Amount in NPR (integer). Converted to paisa internally.
 * @param serviceName    Human-readable service name (displayed in Khalti checkout)
 * @param baseUrl        Base URL for return redirect
 * @param meta           Optional task/service metadata for return URL
 */
export async function initiateKhaltiPayment(
  transactionId: string,
  amountNPR: number,
  serviceName: string,
  baseUrl: string,
  meta?: {
    serviceSlug?: string;
    serviceTaskId?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  },
): Promise<KhaltiPaymentResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error('Khalti secret key not configured');
  }

  const serviceParam = meta?.serviceSlug ? `&service=${encodeURIComponent(meta.serviceSlug)}` : '';
  const taskParam = meta?.serviceTaskId ? `&task=${encodeURIComponent(meta.serviceTaskId)}` : '';

  const payload: KhaltiInitiateRequest = {
    return_url: `${baseUrl}/api/payments/khalti/callback?${serviceParam}${taskParam}`.replace('?&', '?'),
    website_url: baseUrl,
    amount: amountNPR * 100, // Convert NPR to paisa
    purchase_order_id: transactionId,
    purchase_order_name: serviceName,
  };

  // Add customer info if available
  if (meta?.customerName || meta?.customerEmail || meta?.customerPhone) {
    payload.customer_info = {};
    if (meta.customerName) payload.customer_info.name = meta.customerName;
    if (meta.customerEmail) payload.customer_info.email = meta.customerEmail;
    if (meta.customerPhone) payload.customer_info.phone = meta.customerPhone;
  }

  const resp = await fetch(`${KHALTI_BASE}/api/v2/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[khalti] initiate error:', resp.status, errText);
    throw new Error(`Khalti initiation failed (${resp.status}): ${errText}`);
  }

  const data: KhaltiInitiateResponse = await resp.json();

  return {
    paymentUrl: data.payment_url,
    pidx: data.pidx,
    expiresAt: data.expires_at,
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify a Khalti payment by looking up the pidx.
 * Returns full verification result with status.
 */
export async function verifyKhaltiPayment(pidx: string): Promise<KhaltiVerificationResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error('Khalti secret key not configured');
  }

  const resp = await fetch(`${KHALTI_BASE}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[khalti] lookup error:', resp.status, errText);
    throw new Error(`Khalti lookup failed (${resp.status}): ${errText}`);
  }

  const data: KhaltiLookupResponse = await resp.json();

  return {
    verified: data.status === 'Completed',
    pidx,
    status: data.status,
    transactionId: data.transaction_id,
    purchaseOrderId: data.purchase_order_id,
    totalAmountPaisa: data.total_amount,
    totalAmountNPR: Math.round(data.total_amount / 100),
    fee: data.fee,
    rawData: data,
  };
}
