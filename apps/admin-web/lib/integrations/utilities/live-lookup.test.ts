import { performLiveUtilityLookup } from '@/lib/integrations/utilities/live-lookup';

describe('utility live lookup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEA_BILL_LOOKUP_URL;
    delete process.env.NEA_BILL_LOOKUP_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns not configured when no provider proxy exists', async () => {
    const result = await performLiveUtilityLookup('nea-electricity-bill', {
      customerId: '12345678',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.configured).toBe(false);
      expect(result.reason).toBe('not_configured');
    }
  });

  it('normalizes provider proxy results when configured', async () => {
    process.env.NEA_BILL_LOOKUP_URL = 'https://example.com/lookup';
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        customerId: '12345678',
        serviceOffice: 'Balaju',
        dueAmountNpr: 3210,
      }),
    } as Response);

    const result = await performLiveUtilityLookup('nea-electricity-bill', {
      customerId: '12345678',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized.dueAmountNpr).toBe(3210);
      expect(result.source).toBe('provider_proxy');
    }

    global.fetch = originalFetch;
  });
});
