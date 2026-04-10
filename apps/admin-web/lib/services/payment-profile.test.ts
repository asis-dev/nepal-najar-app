import { normalizePaymentProfile, readStoredPaymentProfile } from './payment-profile';

describe('payment-profile helpers', () => {
  it('normalizes and masks wallet handles', () => {
    const profile = normalizePaymentProfile({
      preferredGateway: 'esewa',
      walletLabel: 'My eSewa',
      walletHandle: '9800012345',
      requireExplicitApproval: true,
    });

    expect(profile?.preferredGateway).toBe('esewa');
    expect(profile?.walletLabel).toBe('My eSewa');
    expect(profile?.walletHandleMasked).toBe('98******45');
    expect(profile?.requireExplicitApproval).toBe(true);
  });

  it('reads stored payment profile safely', () => {
    const profile = readStoredPaymentProfile({
      payment_profile: {
        preferredGateway: 'khalti',
        walletLabel: 'Main Khalti',
        walletHandleMasked: '98******45',
        requireExplicitApproval: false,
        lastUpdatedAt: '2026-04-10T00:00:00.000Z',
      },
    });

    expect(profile).toEqual({
      preferredGateway: 'khalti',
      walletLabel: 'Main Khalti',
      walletHandleMasked: '98******45',
      requireExplicitApproval: false,
      lastUpdatedAt: '2026-04-10T00:00:00.000Z',
    });
  });
});
