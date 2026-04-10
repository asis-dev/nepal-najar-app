/**
 * SMS Provider — unified SMS service supporting Sparrow SMS (primary)
 * and Aakash SMS (fallback). Used for citizen notifications on key
 * service task lifecycle events.
 *
 * Sparrow SMS: http://api.sparrowsms.com/v2/sms/
 * Aakash SMS:  https://aakashsms.com/admin/public/sms/v1/send
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SMSResult = {
  sent: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Configuration checks
// ---------------------------------------------------------------------------

function hasSparrowConfig(): boolean {
  return !!(process.env.SPARROW_SMS_TOKEN && process.env.SPARROW_SMS_FROM);
}

function hasAakashConfig(): boolean {
  return !!process.env.AAKASH_SMS_TOKEN;
}

/**
 * Returns true if at least one SMS provider is configured with env vars.
 */
export function canSendSMS(): boolean {
  return hasSparrowConfig() || hasAakashConfig();
}

// ---------------------------------------------------------------------------
// Phone number normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a Nepali phone number for SMS delivery.
 * Strips spaces/dashes, ensures country code prefix.
 */
function normalizePhone(phone: string): string {
  let digits = phone.replace(/[\s\-()]/g, '');

  // If it starts with 0, replace with +977
  if (digits.startsWith('0')) {
    digits = '+977' + digits.slice(1);
  }

  // If it doesn't start with +, assume Nepal
  if (!digits.startsWith('+')) {
    digits = '+977' + digits;
  }

  return digits;
}

// ---------------------------------------------------------------------------
// Sparrow SMS
// ---------------------------------------------------------------------------

async function sendViaSparrow(
  phone: string,
  message: string,
): Promise<SMSResult> {
  const token = process.env.SPARROW_SMS_TOKEN!;
  const from = process.env.SPARROW_SMS_FROM!;

  try {
    const params = new URLSearchParams({
      token,
      from,
      to: normalizePhone(phone),
      text: message,
    });

    const res = await fetch('http://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        sent: false,
        provider: 'sparrow',
        error: `Sparrow API ${res.status}: ${body}`,
      };
    }

    const data = await res.json();

    // Sparrow returns { response_code: 200, ... } on success
    if (data.response_code === 200 || data.response_code === '200') {
      return {
        sent: true,
        provider: 'sparrow',
        messageId: data.request_id || data.message_id || undefined,
      };
    }

    return {
      sent: false,
      provider: 'sparrow',
      error: `Sparrow response_code ${data.response_code}: ${data.response || JSON.stringify(data)}`,
    };
  } catch (err) {
    return {
      sent: false,
      provider: 'sparrow',
      error: `Sparrow error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Aakash SMS
// ---------------------------------------------------------------------------

async function sendViaAakash(
  phone: string,
  message: string,
): Promise<SMSResult> {
  const authToken = process.env.AAKASH_SMS_TOKEN!;

  try {
    const params = new URLSearchParams({
      auth_token: authToken,
      to: normalizePhone(phone),
      text: message,
    });

    const res = await fetch('https://aakashsms.com/admin/public/sms/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        sent: false,
        provider: 'aakash',
        error: `Aakash API ${res.status}: ${body}`,
      };
    }

    const data = await res.json();

    if (data.error === 0 || data.error === '0' || data.response_code === 200) {
      return {
        sent: true,
        provider: 'aakash',
        messageId: data.message_id || data.id || undefined,
      };
    }

    return {
      sent: false,
      provider: 'aakash',
      error: `Aakash error: ${data.message || JSON.stringify(data)}`,
    };
  } catch (err) {
    return {
      sent: false,
      provider: 'aakash',
      error: `Aakash error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Main public API
// ---------------------------------------------------------------------------

/**
 * Send an SMS using Sparrow SMS (primary) with Aakash SMS fallback.
 * Returns the result including provider used and any error.
 */
export async function sendSMS(
  phone: string,
  message: string,
): Promise<SMSResult> {
  if (!canSendSMS()) {
    return {
      sent: false,
      provider: 'none',
      error: 'No SMS provider configured. Set SPARROW_SMS_TOKEN/SPARROW_SMS_FROM or AAKASH_SMS_TOKEN.',
    };
  }

  // Try Sparrow first
  if (hasSparrowConfig()) {
    const result = await sendViaSparrow(phone, message);
    if (result.sent) return result;
    console.warn('[sms] Sparrow failed, trying Aakash fallback:', result.error);

    // If Aakash is also configured, try it as fallback
    if (hasAakashConfig()) {
      return sendViaAakash(phone, message);
    }

    return result;
  }

  // Only Aakash configured
  return sendViaAakash(phone, message);
}
