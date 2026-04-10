export type UtilityLookupField =
  | 'customer_id'
  | 'service_office'
  | 'branch'
  | 'due_amount_npr';

export type UtilityLookupPlan = {
  providerKey: 'nea' | 'kukl';
  serviceSlug: 'nea-electricity-bill' | 'kukl-water-bill';
  providerName: string;
  accountLabel: string;
  officeLabel: string;
  lookupMode: 'official_surface';
  officialLookupUrl: string;
  officialProviderUrl: string;
  supportedGateways: Array<'esewa' | 'khalti'>;
  helperText: string;
  requiredFields: UtilityLookupField[];
  optionalFields: UtilityLookupField[];
  paymentHint: string;
};

export type UtilityLookupInput = {
  customerId?: string;
  serviceOffice?: string;
  branch?: string;
  dueAmountNpr?: number | null;
};

export type UtilityLookupResult = {
  ok: boolean;
  plan: UtilityLookupPlan;
  normalized: {
    customerId: string;
    serviceOffice?: string | null;
    branch?: string | null;
    dueAmountNpr?: number | null;
  };
  summary: string;
  nextAction: string;
  directPaymentReady: boolean;
  errors: string[];
};

const PLANS: Record<UtilityLookupPlan['serviceSlug'], UtilityLookupPlan> = {
  'nea-electricity-bill': {
    providerKey: 'nea',
    serviceSlug: 'nea-electricity-bill',
    providerName: 'Nepal Electricity Authority',
    accountLabel: 'SC / customer ID',
    officeLabel: 'NEA office',
    lookupMode: 'official_surface',
    officialLookupUrl: 'https://www.nea.org.np',
    officialProviderUrl: 'https://www.nea.org.np',
    supportedGateways: ['esewa', 'khalti'],
    helperText:
      'Use the SC number from an old bill or SMS. The correct NEA office matters for bill lookup in some payment surfaces.',
    requiredFields: ['customer_id'],
    optionalFields: ['service_office', 'due_amount_npr'],
    paymentHint:
      'Once the bill amount is known, NepalRepublic can launch payment and track the receipt in your case.',
  },
  'kukl-water-bill': {
    providerKey: 'kukl',
    serviceSlug: 'kukl-water-bill',
    providerName: 'Kathmandu Upatyaka Khanepani Limited',
    accountLabel: 'KUKL customer ID',
    officeLabel: 'Branch',
    lookupMode: 'official_surface',
    officialLookupUrl: 'https://kathmanduwater.org',
    officialProviderUrl: 'https://kathmanduwater.org',
    supportedGateways: ['esewa', 'khalti'],
    helperText:
      'Use the customer ID printed on an older KUKL bill. If your branch is known, save it here so the case stays routed correctly.',
    requiredFields: ['customer_id'],
    optionalFields: ['branch', 'due_amount_npr'],
    paymentHint:
      'If you already know the amount due, NepalRepublic can continue straight into payment and keep the receipt on your case.',
  },
};

export function getUtilityLookupPlan(serviceSlug: string) {
  return PLANS[serviceSlug as UtilityLookupPlan['serviceSlug']] || null;
}

export function lookupUtilityBill(
  serviceSlug: string,
  input: UtilityLookupInput,
): UtilityLookupResult | null {
  const plan = getUtilityLookupPlan(serviceSlug);
  if (!plan) return null;

  const customerId = (input.customerId || '').trim();
  const serviceOffice = (input.serviceOffice || '').trim();
  const branch = (input.branch || '').trim();
  const dueAmountNpr =
    typeof input.dueAmountNpr === 'number' && Number.isFinite(input.dueAmountNpr) && input.dueAmountNpr > 0
      ? Math.round(input.dueAmountNpr)
      : null;

  const errors: string[] = [];

  if (!customerId || customerId.length < 4) {
    errors.push(`${plan.accountLabel} is required.`);
  }

  const directPaymentReady = errors.length === 0 && typeof dueAmountNpr === 'number' && dueAmountNpr > 0;
  const officeDescriptor = serviceOffice || branch || null;

  const summaryParts = [
    `${plan.providerName} lookup prepared for ${customerId}`,
    officeDescriptor ? `(${officeDescriptor})` : null,
    dueAmountNpr ? `· NPR ${dueAmountNpr.toLocaleString()} ready for payment` : null,
  ].filter(Boolean);

  return {
    ok: errors.length === 0,
    plan,
    normalized: {
      customerId,
      serviceOffice: serviceOffice || null,
      branch: branch || null,
      dueAmountNpr,
    },
    summary: summaryParts.join(' '),
    nextAction: directPaymentReady
      ? `Continue to payment for NPR ${dueAmountNpr?.toLocaleString()}.`
      : `Check the current amount due on the official ${plan.providerName} surface, then continue to payment here.`,
    directPaymentReady,
    errors,
  };
}
