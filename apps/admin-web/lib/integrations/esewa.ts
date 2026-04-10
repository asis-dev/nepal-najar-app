/**
 * eSewa ePay Integration
 *
 * Handles payment initiation and verification for eSewa's v2 form-based flow.
 *
 * Flow:
 *   1. Server generates signed form params via `generateEsewaPaymentParams()`
 *   2. Client POSTs form params to eSewa's epay URL (browser redirect)
 *   3. eSewa redirects back to success/failure URL with base64 `data` param
 *   4. Server decodes, verifies signature via `verifyEsewaCallback()`
 *
 * Env vars:
 *   ESEWA_MERCHANT_CODE  – merchant product code (test: EPAYTEST)
 *   ESEWA_SECRET_KEY     – HMAC secret (test: 8gBm/:&EnhH.1/q)
 *
 * Docs: https://developer.esewa.com.np/pages/Epay
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === 'production';

/** eSewa form POST endpoint */
export const ESEWA_EPAY_URL = IS_PROD
  ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
  : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

function getMerchantCode(): string {
  return process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
}

function getSecretKey(): string {
  return process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EsewaFormParams {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaPaymentResult {
  formUrl: string;
  formParams: EsewaFormParams;
  transactionId: string;
}

export interface EsewaCallbackData {
  transaction_uuid: string;
  total_amount: string;
  product_code: string;
  status: string; // 'COMPLETE' | 'PENDING' | 'FAILED' etc.
  signature: string;
  signed_field_names: string;
  ref_id?: string;
  reference_id?: string;
  [key: string]: unknown;
}

export interface EsewaVerificationResult {
  verified: boolean;
  transactionId: string;
  status: string;
  refId: string | null;
  totalAmount: string;
  rawData: EsewaCallbackData;
}

// ---------------------------------------------------------------------------
// Initiation
// ---------------------------------------------------------------------------

/**
 * Generate signed form params for eSewa payment.
 *
 * @param transactionId  Unique transaction UUID (our side)
 * @param amount         Payment amount in NPR (integer)
 * @param baseUrl        Base URL for success/failure redirects
 * @param meta           Optional task/service metadata for redirect URLs
 */
export function generateEsewaPaymentParams(
  transactionId: string,
  amount: number,
  baseUrl: string,
  meta?: { serviceSlug?: string; serviceTaskId?: string | null },
): EsewaPaymentResult {
  const merchantCode = getMerchantCode();
  const secretKey = getSecretKey();

  const totalAmount = amount;
  const taxAmount = 0;
  const productServiceCharge = 0;
  const productDeliveryCharge = 0;

  const serviceParam = meta?.serviceSlug ? `&service=${encodeURIComponent(meta.serviceSlug)}` : '';
  const taskParam = meta?.serviceTaskId ? `&task=${encodeURIComponent(meta.serviceTaskId)}` : '';

  const successUrl = `${baseUrl}/api/payments/esewa/callback?status=success${serviceParam}${taskParam}`;
  const failureUrl = `${baseUrl}/api/payments/esewa/callback?status=failed&txn=${encodeURIComponent(transactionId)}${serviceParam}${taskParam}`;

  // HMAC-SHA256 signature over the signed fields
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const signatureMessage = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${merchantCode}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureMessage)
    .digest('base64');

  const formParams: EsewaFormParams = {
    amount: String(amount),
    tax_amount: String(taxAmount),
    total_amount: String(totalAmount),
    transaction_uuid: transactionId,
    product_code: merchantCode,
    product_service_charge: String(productServiceCharge),
    product_delivery_charge: String(productDeliveryCharge),
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: signedFieldNames,
    signature,
  };

  return {
    formUrl: ESEWA_EPAY_URL,
    formParams,
    transactionId,
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Decode and verify the base64 `data` param that eSewa sends back on success redirect.
 * Returns verification result with signature validity.
 */
export function verifyEsewaCallback(dataParam: string): EsewaVerificationResult {
  const decoded: EsewaCallbackData = JSON.parse(
    Buffer.from(dataParam, 'base64').toString('utf-8'),
  );

  const {
    transaction_uuid,
    total_amount,
    status,
    signature: esewaSignature,
    signed_field_names,
  } = decoded;

  let signatureValid = false;

  if (signed_field_names && esewaSignature) {
    const secretKey = getSecretKey();
    const fields = signed_field_names.split(',');
    const message = fields.map((f) => `${f}=${decoded[f]}`).join(',');
    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    signatureValid = expected === esewaSignature;
  }

  const isComplete = status === 'COMPLETE' && signatureValid;

  return {
    verified: isComplete,
    transactionId: transaction_uuid,
    status,
    refId: (decoded.ref_id || decoded.reference_id || null) as string | null,
    totalAmount: total_amount,
    rawData: decoded,
  };
}
