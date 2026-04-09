import { ask, buildRoutingQuery, shouldAutoRoute } from './ai';
import { rankServices } from './catalog';

describe('services AI routing helpers', () => {
  it('extracts strong routing signals from long pasted hospital text', () => {
    const query = buildRoutingQuery(
      'I need to get a hospital appointment in Kathmandu. The person mentioned Bir Hospital OPD ticket and doctor visit availability next week.',
    );

    expect(query).toContain('hospital');
    expect(query).toContain('appointment');
    expect(query).toContain('bir');
  });

  it('does not auto-route broad hospital requests when multiple hospitals are plausible', async () => {
    const ranked = await rankServices(buildRoutingQuery('hospital appointment'), 'en');
    expect(shouldAutoRoute(buildRoutingQuery('hospital appointment'), ranked)).toBe(false);
  });

  it('auto-routes explicit NEA bill queries', async () => {
    const routedQuery = buildRoutingQuery('pay my nea bill');
    const ranked = await rankServices(routedQuery, 'en');
    expect(ranked[0]?.service.slug).toBe('nea-electricity-bill');
    expect(shouldAutoRoute(routedQuery, ranked)).toBe(true);
  });

  it('auto-routes explicit Bir Hospital queries', async () => {
    const routedQuery = buildRoutingQuery('bir hospital opd appointment');
    const ranked = await rankServices(routedQuery, 'en');
    expect(ranked[0]?.service.slug).toBe('bir-hospital-opd');
    expect(shouldAutoRoute(routedQuery, ranked)).toBe(true);
  });

  it('marks broad hospital questions as ambiguous in ask()', async () => {
    const result = await ask('hospital appointment', 'en');
    expect(result.topService).toBeNull();
    expect(result.routeMode).toBe('ambiguous');
    expect(result.followUpPrompt).toContain('Which hospital');
  });

  it('marks explicit provider questions as direct in ask()', async () => {
    const result = await ask('pay my nea bill', 'en');
    expect(result.topService?.slug).toBe('nea-electricity-bill');
    expect(result.routeMode).toBe('direct');
  });
});
