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

  it('extracts hospital routing signals from admission-style phrasing', () => {
    const query = buildRoutingQuery(
      'Need hospital admission and specialist checkup for my father in Kathmandu',
    );

    expect(query).toContain('hospital');
    expect(query).toContain('appointment');
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

  it('keeps admission-style hospital questions ambiguous instead of misrouting', async () => {
    const result = await ask('Need hospital admission for my father', 'en');
    expect(result.topService).toBeNull();
    expect(result.routeMode).toBe('ambiguous');
  });

  it('treats symptom-based health requests as guided intake instead of a random service list', async () => {
    const result = await ask('I am not feeling well', 'en');
    expect(result.topService).toBeNull();
    expect(result.routeMode).toBe('ambiguous');
    expect(result.routeReason).toContain('health need');
    expect(result.followUpPrompt).toContain('What do you need right now');
    expect(result.followUpOptions).toContain('I need a doctor today');
    expect(result.intakeState?.domain).toBe('health');
  });

  it('recognizes child health intake and guides toward pediatric care', async () => {
    const result = await ask('My child has fever', 'en');
    expect(result.routeMode).toBe('ambiguous');
    expect(result.routeReason).toContain('child health need');
    expect(result.followUpPrompt).toContain('For your child');
    expect(result.followUpOptions).toContain('My child needs a doctor today');
    expect(result.intakeState?.subject).toBe('child');
    expect(result.cited.map((service) => service.slug)).toContain('kanti-childrens-hospital');
  });

  it('recognizes parent health intake and asks parent-specific follow-up', async () => {
    const result = await ask('My father needs a doctor today', 'en');
    expect(result.routeMode).toBe('ambiguous');
    expect(result.followUpPrompt).toContain('For your parent');
    expect(result.followUpOptions).toContain('My parent needs a doctor today');
    expect(result.intakeState?.subject).toBe('parent');
    expect(result.intakeState?.urgency).toBe('today');
  });

  it('recognizes pregnancy intake and asks a maternity-specific follow-up', async () => {
    const result = await ask('Need pregnancy checkup appointment', 'en');
    expect(result.routeMode).toBe('ambiguous');
    expect(result.routeReason).toContain('pregnancy-related');
    expect(result.followUpPrompt).toContain('ANC');
    expect(result.followUpOptions).toContain('I need an ANC checkup');
    expect(result.intakeState?.domain).toBe('health');
  });

  it('keeps intake context across short follow-up turns in the same session', async () => {
    const sessionId = `test-session-${Date.now()}`;
    await ask('I am not feeling well', 'en', sessionId);
    const result = await ask('for my father', 'en', sessionId);

    expect(result.routeMode).toBe('ambiguous');
    expect(result.intakeState?.domain).toBe('health');
    expect(result.intakeState?.subject).toBe('parent');
    expect(result.followUpPrompt).toContain('For your parent');
  });
});
