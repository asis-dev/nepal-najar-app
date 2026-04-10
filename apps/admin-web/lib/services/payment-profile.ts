export type PaymentGateway = 'esewa' | 'khalti';

export interface PaymentProfile {
  preferredGateway: PaymentGateway;
  walletLabel: string | null;
  walletHandleMasked: string | null;
  requireExplicitApproval: boolean;
  lastUpdatedAt: string | null;
}

function normalizeString(value: unknown, max = 120) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function maskWalletHandle(value: string | null) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= 4) return '*'.repeat(compact.length);
  return `${compact.slice(0, 2)}${'*'.repeat(Math.max(2, compact.length - 4))}${compact.slice(-2)}`;
}

export function normalizePaymentProfile(input: Record<string, unknown>): PaymentProfile | null {
  const preferredGateway = input.preferredGateway === 'khalti' ? 'khalti' : input.preferredGateway === 'esewa' ? 'esewa' : null;
  if (!preferredGateway) return null;

  const walletLabel = normalizeString(input.walletLabel, 80);
  const walletHandle = normalizeString(input.walletHandle, 80);
  const requireExplicitApproval =
    typeof input.requireExplicitApproval === 'boolean' ? input.requireExplicitApproval : true;

  return {
    preferredGateway,
    walletLabel,
    walletHandleMasked: maskWalletHandle(walletHandle),
    requireExplicitApproval,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function readStoredPaymentProfile(preferences: Record<string, unknown> | null | undefined): PaymentProfile | null {
  const candidate = preferences?.payment_profile;
  if (!candidate || typeof candidate !== 'object') return null;
  const row = candidate as Record<string, unknown>;
  if (row.preferredGateway !== 'esewa' && row.preferredGateway !== 'khalti') return null;

  return {
    preferredGateway: row.preferredGateway,
    walletLabel: typeof row.walletLabel === 'string' ? row.walletLabel : null,
    walletHandleMasked: typeof row.walletHandleMasked === 'string' ? row.walletHandleMasked : null,
    requireExplicitApproval:
      typeof row.requireExplicitApproval === 'boolean' ? row.requireExplicitApproval : true,
    lastUpdatedAt: typeof row.lastUpdatedAt === 'string' ? row.lastUpdatedAt : null,
  };
}
