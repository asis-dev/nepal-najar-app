create table if not exists user_activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  title text not null,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_owner_created_idx
  on user_activity_events(owner_id, created_at desc);

create index if not exists user_activity_events_entity_idx
  on user_activity_events(owner_id, entity_type, entity_id, created_at desc);

alter table user_activity_events enable row level security;

drop policy if exists user_activity_events_owner_all on user_activity_events;
create policy user_activity_events_owner_all on user_activity_events
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
