-- Accountability layer: disputes, minister responses, weekly scoreboards
create extension if not exists "pgcrypto";

-- Minister / ministry responses to action items
create table if not exists minister_responses (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid references party_action_items(id) on delete cascade,
  commitment_id text,                    -- optional if responding to a commitment directly
  author_name  text not null,
  author_role  text,                     -- "Minister of Energy", etc
  verified     boolean not null default false,
  body         text not null,
  body_ne      text,
  source_url   text,                     -- link to official statement if any
  posted_at    timestamptz not null default now(),
  submitted_ip_hash text
);
create index if not exists minister_responses_item_idx on minister_responses(item_id, posted_at desc);
create index if not exists minister_responses_commitment_idx on minister_responses(commitment_id, posted_at desc);

alter table minister_responses enable row level security;
drop policy if exists "minister_responses_read_public" on minister_responses;
create policy "minister_responses_read_public" on minister_responses for select using (true);
drop policy if exists "minister_responses_insert_public" on minister_responses;
create policy "minister_responses_insert_public" on minister_responses for insert with check (true);

-- Dispute / appeal flow — anyone can dispute a status with evidence
create table if not exists commitment_disputes (
  id            uuid primary key default gen_random_uuid(),
  commitment_id text not null,
  claimant_name text,
  claimant_role text,                    -- citizen, journalist, ministry, ngo
  dispute_type  text not null default 'status' check (dispute_type in ('status','progress','evidence','other')),
  current_value text,
  proposed_value text,
  rationale     text not null,
  evidence_url  text,
  evidence_urls text[],
  status        text not null default 'open' check (status in ('open','accepted','rejected','duplicate')),
  reviewer_notes text,
  ip_hash       text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists disputes_cmt_idx on commitment_disputes(commitment_id, created_at desc);
create index if not exists disputes_status_idx on commitment_disputes(status, created_at desc);

alter table commitment_disputes enable row level security;
drop policy if exists "disputes_read_public" on commitment_disputes;
create policy "disputes_read_public" on commitment_disputes for select using (true);
drop policy if exists "disputes_insert_public" on commitment_disputes;
create policy "disputes_insert_public" on commitment_disputes for insert with check (true);

-- Weekly auto-drafted scoreboard posts (tweet thread / social copy)
create table if not exists weekly_scoreboards (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null unique,
  headline     text not null,
  thread       jsonb not null default '[]'::jsonb,  -- array of post strings
  stats        jsonb,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists scoreboard_week_idx on weekly_scoreboards(week_start desc);

alter table weekly_scoreboards enable row level security;
drop policy if exists "scoreboard_read_public" on weekly_scoreboards;
create policy "scoreboard_read_public" on weekly_scoreboards for select using (true);

-- Contributor karma view (public leaderboard)
create or replace view contributor_karma as
  with petitions_agg as (
    select coalesce(display_name, 'Anonymous') as name,
           count(*)::int as sign_count
    from petition_signatures
    where display_name is not null and length(trim(display_name)) > 0
    group by coalesce(display_name, 'Anonymous')
  )
  select name, sign_count, sign_count::int as karma
  from petitions_agg
  order by sign_count desc
  limit 500;
