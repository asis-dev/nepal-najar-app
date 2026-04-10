import {
  buildAssistantTaskAnswers,
  getHouseholdMemberBestEffort,
  insertServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
  listTaskEventsBestEffort,
  updateServiceTaskWithCompatibility,
} from './task-store';

function createInsertQuery(responses: Array<{ data?: any; error?: any }>) {
  const payloads: any[] = [];
  const single = jest.fn(async () => responses.shift() ?? { data: null, error: null });
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn((payload) => {
    payloads.push({ ...payload });
    return { select };
  });
  return { insert, select, single, payloads };
}

function createUpdateQuery(responses: Array<{ data?: any; error?: any }>) {
  const payloads: any[] = [];
  const single = jest.fn(async () => responses.shift() ?? { data: null, error: null });
  const select = jest.fn(() => ({ single }));
  const eq = jest.fn(() => ({ select }));
  const update = jest.fn((payload) => {
    payloads.push({ ...payload });
    return { eq };
  });
  return { update, eq, select, single, payloads };
}

describe('task-store compatibility helpers', () => {
  it('retries inserts after removing missing optional columns', async () => {
    const query = createInsertQuery([
      {
        data: null,
        error: { message: "Could not find the 'action_state' column of 'service_tasks' in the schema cache" },
      },
      {
        data: { id: 'task-1' },
        error: null,
      },
    ]);

    const supabase = {
      from: jest.fn(() => ({ insert: query.insert })),
    } as any;

    const result = await insertServiceTaskWithCompatibility(supabase, {
      service_slug: 'nea-electricity-bill',
      action_state: {},
      summary: 'Pay your bill',
    });

    expect(result.data).toEqual({ id: 'task-1' });
    expect(query.insert).toHaveBeenCalledTimes(2);
    expect(query.payloads[0]).toHaveProperty('action_state');
    expect(query.payloads[1]).not.toHaveProperty('action_state');
  });

  it('retries updates after removing missing optional columns', async () => {
    const query = createUpdateQuery([
      {
        data: null,
        error: { message: "Could not find the 'notes' column of 'service_tasks' in the schema cache" },
      },
      {
        data: { id: 'task-1', status: 'pending' },
        error: null,
      },
    ]);

    const supabase = {
      from: jest.fn(() => ({ update: query.update })),
    } as any;

    const result = await updateServiceTaskWithCompatibility(supabase, 'task-1', {
      notes: 'receipt ref',
      status: 'pending',
    });

    expect(result.data).toEqual({ id: 'task-1', status: 'pending' });
    expect(query.update).toHaveBeenCalledTimes(2);
    expect(query.payloads[0]).toHaveProperty('notes');
    expect(query.payloads[1]).not.toHaveProperty('notes');
  });

  it('swallows missing service_task_events table errors', async () => {
    const insert = jest.fn(async () => ({
      error: { message: 'relation "service_task_events" does not exist' },
    }));

    const supabase = {
      from: jest.fn(() => ({ insert })),
    } as any;

    await expect(
      insertTaskEventBestEffort(supabase, { task_id: 'task-1', owner_id: 'user-1', event_type: 'task_started' }),
    ).resolves.toBeUndefined();
  });

  it('returns empty events when service_task_events table is missing', async () => {
    const limit = jest.fn(async () => ({
      data: null,
      error: { message: 'relation "service_task_events" does not exist' },
    }));
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));

    const supabase = {
      from: jest.fn(() => ({ select })),
    } as any;

    await expect(listTaskEventsBestEffort(supabase, 'task-1')).resolves.toEqual([]);
  });

  it('returns null when household_members table is missing', async () => {
    const maybeSingle = jest.fn(async () => ({
      data: null,
      error: { message: 'relation "household_members" does not exist' },
    }));
    const is = jest.fn(() => ({ maybeSingle }));
    const eq = jest.fn(() => ({ is }));
    const select = jest.fn(() => ({ eq }));

    const supabase = {
      from: jest.fn(() => ({ select })),
    } as any;

    await expect(getHouseholdMemberBestEffort(supabase, 'member-1')).resolves.toBeNull();
  });

  it('builds compact assistant intake answers for health tasks', () => {
    expect(
      buildAssistantTaskAnswers({
        sourceQuery: 'I am not feeling well for my father',
        sessionId: 'session-1',
        intakeState: {
          domain: 'health',
          subject: 'parent',
          urgency: 'today',
          careNeed: 'same_day',
        },
        intakeSlots: {
          health: {
            hospitalHint: 'unknown',
            specialtyHint: 'general',
            visitGoal: 'same_day',
          },
          utilities: {
            provider: 'unknown',
            amountKnown: false,
            accountKnown: false,
          },
          license: { intent: 'unknown' },
          citizenship: { intent: 'unknown' },
          passport: { intent: 'unknown' },
        },
      }),
    ).toEqual({
      source_query: 'I am not feeling well for my father',
      assistant_session_id: 'session-1',
      assistant_intake_version: 1,
      assistant_intake: {
        domain: 'health',
        subject: 'parent',
        urgency: 'today',
        care_need: 'same_day',
        health: {
          specialtyHint: 'general',
          visitGoal: 'same_day',
        },
      },
    });
  });

  it('keeps utility booleans while removing unknown values', () => {
    expect(
      buildAssistantTaskAnswers({
        sourceQuery: 'Pay my electricity bill',
        intakeState: {
          domain: 'utilities',
          subject: 'unknown',
          urgency: 'unknown',
          careNeed: 'unknown',
        },
        intakeSlots: {
          health: {
            hospitalHint: 'unknown',
            specialtyHint: 'unknown',
            visitGoal: 'unknown',
          },
          utilities: {
            provider: 'nea',
            amountKnown: false,
            accountKnown: true,
          },
          license: { intent: 'unknown' },
          citizenship: { intent: 'unknown' },
          passport: { intent: 'unknown' },
        },
      }),
    ).toEqual({
      source_query: 'Pay my electricity bill',
      assistant_intake_version: 1,
      assistant_intake: {
        domain: 'utilities',
        utilities: {
          provider: 'nea',
          amountKnown: false,
          accountKnown: true,
        },
      },
    });
  });
});
