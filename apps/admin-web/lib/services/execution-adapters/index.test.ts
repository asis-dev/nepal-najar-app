import { getAdapter, listAdapters } from './index';

describe('execution adapter registry', () => {
  it('exposes key Wave 1 adapters', () => {
    const slugs = listAdapters().map((adapter) => adapter.slug);

    expect(slugs).toContain('passport-renewal');
    expect(slugs).toContain('drivers-license-renewal');
    expect(slugs).toContain('nea-bill-payment');
    expect(slugs).toContain('bir-hospital-opd');
  });

  it('marks utility bill adapters as executable while passport renewal stays assisted', () => {
    const nea = getAdapter('nea-bill-payment');
    const passport = getAdapter('passport-renewal');

    expect(nea).not.toBeNull();
    expect(passport).not.toBeNull();

    expect(nea?.canExecute()).toBe(true);
    expect(nea?.executionLevel).toBe('direct');
    expect(nea?.capabilities.canProcessPayment).toBe(false);

    expect(passport?.canExecute()).toBe(false);
    expect(passport?.executionLevel).toBe('guided');
  });
});
