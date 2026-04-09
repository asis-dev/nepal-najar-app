import { rankServices } from './catalog';

describe('rankServices', () => {
  it('prioritizes hospital services for hospital appointment queries', async () => {
    const ranked = await rankServices('hospital appointment', 'en');
    expect(ranked[0]?.service.providerType).toBe('hospital');
    expect(ranked[0]?.service.slug).toBe('bir-hospital-opd');
    expect(ranked[1]?.service.providerType).toBe('hospital');
  });

  it('prioritizes license renewal for renewal queries', async () => {
    const ranked = await rankServices('renew my driving license', 'en');
    expect(ranked[0]?.service.slug).toBe('drivers-license-renewal');
  });

  it('prioritizes NEA bill payment for explicit NEA payment queries', async () => {
    const ranked = await rankServices('pay my nea bill', 'en');
    expect(ranked[0]?.service.slug).toBe('nea-electricity-bill');
  });
});
