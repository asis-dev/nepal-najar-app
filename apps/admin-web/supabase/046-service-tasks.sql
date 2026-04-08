-- Nepal Republic — Service Tasks / Action Engine
-- Turns static service guides into resumable user workflows.

create table if not exists service_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  service_slug text not null,
  service_title text not null,
  service_category text not null,
  locale text not null default 'en' check (locale in ('en', 'ne')),

  status text not null default 'intake' check (status in (
    'intake',
    'collecting_docs',
    'ready',
    'in_progress',
    'booked',
    'submitted',
    'completed',
    'blocked'
  )),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  current_step int not null default 1 check (current_step >= 1),
  total_steps int not null default 1 check (total_steps >= 1),

  summary text,
  next_action text,
  workflow_mode text not null default 'guide_only' check (workflow_mode in ('guide_only', 'appointment', 'payment', 'mixed')),
  requires_appointment boolean not null default false,
  supports_online_payment boolean not null default false,
  office_visit_required boolean not null default false,
  milestones jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  action_state jsonb not null default '{}'::jsonb,
  missing_docs jsonb not null default '[]'::jsonb,
  ready_docs jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  notes text,

  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_tasks_active_unique
  on service_tasks(owner_id, service_slug)
  where completed_at is null and status <> 'completed';

create index if not exists service_tasks_owner_idx
  on service_tasks(owner_id, updated_at desc);

create index if not exists service_tasks_status_idx
  on service_tasks(owner_id, status, updated_at desc);

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

create or replace function service_tasks_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  new.last_activity_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists service_tasks_touch on service_tasks;
create trigger service_tasks_touch before update on service_tasks
  for each row execute function service_tasks_touch_updated_at();

alter table service_tasks enable row level security;
alter table service_task_events enable row level security;

drop policy if exists service_tasks_owner_all on service_tasks;
create policy service_tasks_owner_all on service_tasks
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists service_task_events_owner_all on service_task_events;
create policy service_task_events_owner_all on service_task_events
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
