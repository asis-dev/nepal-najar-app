# Service Task Schema Compatibility

## Why this exists

The service task backend had started writing newer fields into `service_tasks` before every environment had the matching schema applied. That caused runtime failures such as:

- `Could not find the 'action_state' column of 'service_tasks' in the schema cache`

The goal of this hardening pass is to make task creation and updates resilient while migrations catch up.

## What was hardened

### Runtime compatibility layer

`/lib/services/task-store.ts` now:

- retries inserts and updates after stripping missing optional columns
- treats missing `service_task_events` as non-fatal
- treats missing `household_members` as non-fatal

This keeps critical flows like:

- `Pay my electricity bill`
- assistant-started task creation
- action completion
- task history fetches

from crashing on partially migrated databases.

### Backfill migration

`/supabase/048-service-tasks-backfill.sql` adds any missing task columns and creates `service_task_events` if needed.

It is dependency-safe:

- `target_member_id` is added without assuming `household_members` already exists
- the foreign key is attached only if `household_members` is present

## Required follow-up

Apply:

- `047-household-members.sql`
- `048-service-tasks-backfill.sql`

After that, the compatibility layer becomes a safety net rather than the primary way the app stays alive.

## Validation done

- service smoke check passes
- direct route for `Pay my electricity bill` works again
- assistant route for `Pay my electricity bill` returns `requiresAuth` instead of crashing
- Jest coverage added for compatibility helpers
