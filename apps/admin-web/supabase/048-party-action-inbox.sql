-- Nepal Republic — Party Action Inbox
-- 048-party-action-inbox.sql
--
-- Auto-generated public todo list for ministers, ministries, and parties.
-- Sources: stalled commitments, silent commitments, overdue commitments,
-- complaint clusters, failed portals, bad wait-times, service corrections,
-- citizen petitions.
--
-- Idempotent: generator upserts on (source_kind, source_ref).

create extension if not exists "pgcrypto";

create table if not exists party_action_items (
  id              uuid primary key default gen_random_uuid(),

  -- Who owes this task?
  target_type     text not null check (target_type in ('minister','ministry','party')),
  target_slug     text not null,
  target_name     text,
  target_name_ne  text,

  -- What generated it?
  source_kind     text not null check (source_kind in (
    'commitment_stalled',
    'commitment_silent',
    'commitment_overdue',
    'complaint_cluster',
    'portal_down',
    'wait_time_bad',
    'service_correction',
    'petition'
  )),
  source_ref      text not null,    -- slug/id of the source row

  -- Content
  title           text not null,
  title_ne        text,
  description     text,
  description_ne  text,
  link            text,             -- where citizens can read more
  priority        int not null default 2 check (priority in (1,2,3)),

  -- Timeline
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  due_on          date,
  resolved_at     timestamptz,
  resolution_note text,

  -- Pressure signals
  upvotes         int not null default 0,
  share_count     int not null default 0,

  -- Generator metadata
  generator_version int not null default 1,

  unique (source_kind, source_ref)
);

create index if not exists pai_target_idx   on party_action_items(target_type, target_slug);
create index if not exists pai_open_idx     on party_action_items(resolved_at) where resolved_at is null;
create index if not exists pai_priority_idx on party_action_items(priority, first_seen_at desc);
create index if not exists pai_source_idx   on party_action_items(source_kind);

alter table party_action_items enable row level security;

-- Everyone can read all items (this is the public pressure tool).
drop policy if exists "pai_read_public" on party_action_items;
create policy "pai_read_public" on party_action_items for select using (true);

-- Only service role can write (inserts come from the sweep generator).
-- RLS blocks anon writes; API layer uses service role.

-- Upvotes: single table, IP-hash dedup.
create table if not exists party_action_votes (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references party_action_items(id) on delete cascade,
  ip_hash    text not null,
  owner_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (item_id, ip_hash)
);

create index if not exists pai_votes_item_idx on party_action_votes(item_id);

alter table party_action_votes enable row level security;
drop policy if exists "pai_votes_insert_public" on party_action_votes;
create policy "pai_votes_insert_public" on party_action_votes for insert with check (true);
drop policy if exists "pai_votes_read_public" on party_action_votes;
create policy "pai_votes_read_public" on party_action_votes for select using (true);

-- Trigger: keep upvotes count in sync
create or replace function pai_vote_inc() returns trigger as $$
begin
  update party_action_items set upvotes = upvotes + 1 where id = new.item_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists pai_vote_after_insert on party_action_votes;
create trigger pai_vote_after_insert
  after insert on party_action_votes
  for each row execute function pai_vote_inc();

-- Summary view: open tasks per target
create or replace view party_action_summary as
  select
    target_type,
    target_slug,
    max(target_name)    as target_name,
    max(target_name_ne) as target_name_ne,
    count(*) filter (where resolved_at is null)                                                 as open_count,
    count(*) filter (where resolved_at is null and due_on is not null and due_on < current_date) as overdue_count,
    count(*) filter (where resolved_at is null and priority = 1)                                as urgent_count,
    sum(upvotes) filter (where resolved_at is null)                                             as total_upvotes,
    max(first_seen_at)                                                                          as latest_added_at
  from party_action_items
  group by target_type, target_slug;

comment on view party_action_summary is
  'Per-target rollup used by scorecard/minister pages and /inbox index.';
