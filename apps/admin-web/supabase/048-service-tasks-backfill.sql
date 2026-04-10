-- Nepal Republic — service task schema backfill
-- Brings older databases up to the shape expected by the current service engine.

alter table if exists service_tasks
  add column if not exists workflow_mode text not null default 'guide_only';

alter table if exists service_tasks
  add column if not exists requires_appointment boolean not null default false;

alter table if exists service_tasks
  add column if not exists supports_online_payment boolean not null default false;

alter table if exists service_tasks
  add column if not exists office_visit_required boolean not null default false;

alter table if exists service_tasks
  add column if not exists milestones jsonb not null default '[]'::jsonb;

alter table if exists service_tasks
  add column if not exists actions jsonb not null default '[]'::jsonb;

alter table if exists service_tasks
  add column if not exists action_state jsonb not null default '{}'::jsonb;

alter table if exists service_tasks
  add column if not exists target_member_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'household_members'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'service_tasks_target_member_id_fkey'
  ) then
    alter table service_tasks
      add constraint service_tasks_target_member_id_fkey
      foreign key (target_member_id)
      references household_members(id)
      on delete set null;
  end if;
end $$;

alter table if exists service_tasks
  add column if not exists target_member_name text;

alter table if exists service_tasks
  add column if not exists notes text;

create table if not exists service_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references service_tasks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  note text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_task_events_task_idx
  on service_task_events(task_id, created_at desc);

alter table if exists service_task_events enable row level security;

drop policy if exists service_task_events_owner_all on service_task_events;
create policy service_task_events_owner_all on service_task_events
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
