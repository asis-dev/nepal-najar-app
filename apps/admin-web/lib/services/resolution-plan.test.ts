import { buildTaskResolutionPlan } from './resolution-plan';

describe('buildTaskResolutionPlan', () => {
  it('marks missing documents as a citizen-side blocker', () => {
    const plan = buildTaskResolutionPlan({
      status: 'collecting_docs',
      queue_state: 'new',
      missing_docs: [{ label: 'Citizenship certificate' }],
      answers: {},
    });

    expect(plan.status).toBe('needs_citizen');
    expect(plan.headline).toContain('missing documents');
    expect(plan.blockers[0]).toContain('Citizenship certificate');
  });

  it('detects appointment tasks waiting for booking confirmation', () => {
    const plan = buildTaskResolutionPlan({
      status: 'in_progress',
      queue_state: 'waiting_on_citizen',
      waiting_on_party: 'citizen',
      workflow_mode: 'appointment',
      requires_appointment: true,
      action_state: {
        appointment_requested: { completed: true, value: 'Pediatrics · Mon, Apr 14' },
      },
      answers: {
        assistant_intake: {
          domain: 'health',
          subject: 'child',
          care_need: 'same_day',
          health: {
            specialtyHint: 'pediatric',
            visitGoal: 'same_day',
          },
        },
      },
      missing_docs: [],
      next_action: 'Finish the booking and save the reference.',
    });

    expect(plan.status).toBe('needs_citizen');
    expect(plan.citizenAction).toContain('Finish the booking');
    expect(plan.citizenContext).toContain('Health case');
    expect(plan.blockers).toContain('Booking reference or ticket has not been confirmed');
  });

  it('marks resolved tasks as resolved', () => {
    const plan = buildTaskResolutionPlan({
      status: 'completed',
      queue_state: 'resolved',
      answers: {},
      missing_docs: [],
    });

    expect(plan.status).toBe('resolved');
    expect(plan.headline).toContain('clear recorded resolution');
    expect(plan.blockers).toEqual([]);
  });
});
