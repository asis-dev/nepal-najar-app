import { getServiceBySlug } from '@/lib/services/catalog';
import { getHospitalAppointmentPlan, recommendHospitalAppointment } from './adapter';

describe('hospital appointment adapter', () => {
  it('builds a walk-in plan for Bir Hospital', async () => {
    const service = await getServiceBySlug('bir-hospital-opd');
    expect(service).toBeTruthy();

    const plan = getHospitalAppointmentPlan(service!);
    expect(plan?.bookingMode).toBe('walk_in');
    expect(plan?.appointmentWindows.length).toBeGreaterThan(0);
    expect(plan?.specialties).toContain('General medicine');
  });

  it('builds an online-friendly plan for TUTH', async () => {
    const service = await getServiceBySlug('tuth-opd');
    expect(service).toBeTruthy();

    const plan = getHospitalAppointmentPlan(service!);
    expect(plan?.bookingMode).toBe('external_portal');
    expect(plan?.bookingUrl).toContain('iom.edu.np');
  });

  it('recommends pediatric care when the assistant intake says child health', async () => {
    const service = await getServiceBySlug('tuth-opd');
    expect(service).toBeTruthy();

    const plan = getHospitalAppointmentPlan(service!);
    expect(plan).toBeTruthy();

    const recommendation = recommendHospitalAppointment(plan!, {
      domain: 'health',
      subject: 'child',
      urgency: 'today',
      care_need: 'same_day',
      health: {
        specialtyHint: 'pediatric',
        visitGoal: 'same_day',
      },
    });

    expect(recommendation.specialty).toBe('Pediatrics');
    expect(recommendation.preferredWindow).toBe(plan!.appointmentWindows[0].label);
    expect(recommendation.rationale).toContain('child health case');
  });
});
