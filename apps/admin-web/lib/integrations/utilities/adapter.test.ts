import { getUtilityLookupPlan, lookupUtilityBill } from '@/lib/integrations/utilities/adapter';

describe('utility adapter', () => {
  it('returns a lookup plan for NEA', () => {
    const plan = getUtilityLookupPlan('nea-electricity-bill');
    expect(plan?.providerKey).toBe('nea');
    expect(plan?.supportedGateways).toEqual(expect.arrayContaining(['esewa', 'khalti']));
  });

  it('requires a customer id', () => {
    const result = lookupUtilityBill('nea-electricity-bill', {});
    expect(result?.ok).toBe(false);
    expect(result?.errors[0]).toMatch(/customer/i);
  });

  it('marks direct payment ready when amount is known', () => {
    const result = lookupUtilityBill('nea-electricity-bill', {
      customerId: '12345678',
      serviceOffice: 'Balaju',
      dueAmountNpr: 2480,
    });

    expect(result?.ok).toBe(true);
    expect(result?.directPaymentReady).toBe(true);
    expect(result?.normalized.dueAmountNpr).toBe(2480);
  });

  it('supports KUKL lookup', () => {
    const result = lookupUtilityBill('kukl-water-bill', {
      customerId: 'KUKL-7788',
      branch: 'Tripureshwor',
    });

    expect(result?.ok).toBe(true);
    expect(result?.directPaymentReady).toBe(false);
    expect(result?.plan.providerKey).toBe('kukl');
  });
});
