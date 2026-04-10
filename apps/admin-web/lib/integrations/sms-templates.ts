/**
 * SMS Templates — bilingual (English/Nepali) SMS messages for
 * service task lifecycle events. All messages kept under 160 chars
 * for single-SMS delivery.
 */

type Locale = 'en' | 'ne';

function shortRef(caseRef: string): string {
  // If already short like "NR-ABC12345", keep it
  return caseRef.length > 12 ? caseRef.slice(0, 12) : caseRef;
}

// ---------------------------------------------------------------------------
// Task Created
// ---------------------------------------------------------------------------

export function taskCreated(
  serviceName: string,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  if (locale === 'ne') {
    return `${serviceName} को लागि तपाईंको अनुरोध दर्ता भयो। केस: ${ref}। nepalrepublic.org/me/tasks मा हेर्नुहोस्`;
  }
  return `Your ${serviceName} request submitted. Case: ${ref}. Track at nepalrepublic.org/me/tasks`;
}

// ---------------------------------------------------------------------------
// Task Sent to Government
// ---------------------------------------------------------------------------

export function taskSentToGovt(
  serviceName: string,
  officeName: string,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  if (locale === 'ne') {
    return `${serviceName} (${ref}) ${officeName} मा पठाइयो। जवाफ आएपछि सूचना दिनेछौं।`;
  }
  return `${serviceName} (${ref}) sent to ${officeName}. We'll notify you when they respond.`;
}

// ---------------------------------------------------------------------------
// Government Replied
// ---------------------------------------------------------------------------

export function govtReplied(
  serviceName: string,
  replyType: string,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  if (locale === 'ne') {
    return `सरकारले ${serviceName} (${ref}) मा जवाफ दियो। nepalrepublic.org/me/tasks मा विवरण हेर्नुहोस्`;
  }
  return `Govt responded to ${serviceName} (${ref}). Check nepalrepublic.org/me/tasks`;
}

// ---------------------------------------------------------------------------
// SLA Warning
// ---------------------------------------------------------------------------

export function slaWarning(
  serviceName: string,
  hoursRemaining: number,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  const hrs = Math.round(hoursRemaining);
  if (locale === 'ne') {
    return `समयसीमा नजिकिँदैछ: ${serviceName} (${ref}) — ${hrs} घण्टा बाँकी। सरकारबाट जवाफ आएको छैन।`;
  }
  return `Deadline near: ${serviceName} (${ref}) — ${hrs}h left. No govt response yet.`;
}

// ---------------------------------------------------------------------------
// SLA Breached
// ---------------------------------------------------------------------------

export function slaBreached(
  serviceName: string,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  if (locale === 'ne') {
    return `समयसीमा नाघ्यो: ${serviceName} (${ref}) को लागि सरकारले समयमा जवाफ दिएन।`;
  }
  return `Deadline MISSED: Govt did not respond to ${serviceName} (${ref}) in time.`;
}

// ---------------------------------------------------------------------------
// Payment Confirmed
// ---------------------------------------------------------------------------

export function paymentConfirmed(
  serviceName: string,
  amount: number,
  caseRef: string,
  locale: Locale = 'en',
): string {
  const ref = shortRef(caseRef);
  if (locale === 'ne') {
    return `रु. ${amount} भुक्तानी पुष्टि भयो — ${serviceName} (${ref})।`;
  }
  return `Payment of Rs. ${amount} confirmed for ${serviceName} (${ref}).`;
}
