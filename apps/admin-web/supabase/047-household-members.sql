-- Nepal Republic — Household / Delegation groundwork
-- Lets a user manage services on behalf of parents, children, spouse, or relatives.

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text not null check (relationship in (
    'self',
    'parent',
    'child',
    'spouse',
    'sibling',
    'relative',
    'other'
  )),
  date_of_birth date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_members_owner_idx
  on household_members(owner_id, created_at desc)
  where archived_at is null;

create or replace function household_members_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists household_members_touch on household_members;
create trigger household_members_touch before update on household_members
  for each row execute function household_members_touch_updated_at();

alter table household_members enable row level security;

drop policy if exists household_members_owner_all on household_members;
create policy household_members_owner_all on household_members
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

alter table service_tasks
  add column if not exists target_member_id uuid references household_members(id) on delete set null,
  add column if not exists target_member_name text;

create index if not exists service_tasks_target_member_idx
  on service_tasks(owner_id, target_member_id, updated_at desc);
