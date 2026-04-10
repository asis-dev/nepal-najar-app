import { getUtilityLookupPlan, lookupUtilityBill, type UtilityLookupInput } from './adapter';

export type UtilityLiveLookupResult =
  | {
      ok: true;
      providerKey: string;
      configured: true;
      live: true;
      source: 'provider_proxy';
      normalized: {
        customerId: string;
        serviceOffice?: string | null;
        branch?: string | null;
        dueAmountNpr?: number | null;
      };
      summary: string;
      nextAction: string;
    }
  | {
      ok: false;
      configured: boolean;
      live: false;
      reason: string;
      summary: string;
      nextAction: string;
    };

function getEnvConfig(serviceSlug: string) {
  if (serviceSlug === 'nea-electricity-bill') {
    return {
      url: process.env.NEA_BILL_LOOKUP_URL || '',
      token: process.env.NEA_BILL_LOOKUP_TOKEN || '',
    };
  }

  if (serviceSlug === 'kukl-water-bill') {
    return {
      url: process.env.KUKL_BILL_LOOKUP_URL || '',
      token: process.env.KUKL_BILL_LOOKUP_TOKEN || '',
    };
  }

  return { url: '', token: '' };
}

export async function performLiveUtilityLookup(
  serviceSlug: string,
  input: UtilityLookupInput,
): Promise<UtilityLiveLookupResult> {
  const plan = getUtilityLookupPlan(serviceSlug);
  if (!plan) {
    return {
      ok: false,
      configured: false,
      live: false,
      reason: 'unsupported_service',
      summary: 'Live utility lookup is not supported for this service.',
      nextAction: 'Use manual entry instead.',
    };
  }

  const { url, token } = getEnvConfig(serviceSlug);
  if (!url) {
    return {
      ok: false,
      configured: false,
      live: false,
      reason: 'not_configured',
      summary: `Live ${plan.providerName} lookup is not configured in this environment.`,
      nextAction: 'Use bill photo scan or enter the current amount after checking the official provider surface.',
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      provider_key: plan.providerKey,
      service_slug: serviceSlug,
      customer_id: input.customerId || '',
      service_office: input.serviceOffice || null,
      branch: input.branch || null,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    return {
      ok: false,
      configured: true,
      live: false,
      reason: 'lookup_failed',
      summary: `${plan.providerName} live lookup failed (${response.status}).`,
      nextAction: bodyText
        ? 'Use the bill photo scan or enter the amount manually for now.'
        : 'Use the bill photo scan or enter the amount manually for now.',
    };
  }

  const data = await response.json();
  const normalized = lookupUtilityBill(serviceSlug, {
    customerId: data.customerId || input.customerId,
    serviceOffice: data.serviceOffice || input.serviceOffice,
    branch: data.branch || input.branch,
    dueAmountNpr:
      typeof data.dueAmountNpr === 'number'
        ? data.dueAmountNpr
        : input.dueAmountNpr,
  });

  if (!normalized?.ok) {
    return {
      ok: false,
      configured: true,
      live: false,
      reason: 'invalid_provider_payload',
      summary: `${plan.providerName} live lookup returned incomplete data.`,
      nextAction: 'Use bill photo scan or enter the amount manually.',
    };
  }

  return {
    ok: true,
    configured: true,
    live: true,
    source: 'provider_proxy',
    providerKey: plan.providerKey,
    normalized: normalized.normalized,
    summary:
      data.summary ||
      `${plan.providerName} returned a live amount of NPR ${normalized.normalized.dueAmountNpr?.toLocaleString()}.`,
    nextAction:
      data.nextAction ||
      `Continue to payment for NPR ${normalized.normalized.dueAmountNpr?.toLocaleString()}.`,
  };
}
