-- Nepal Republic — Services feedback tables
-- 046-services-feedback.sql
--
-- Adds crowdsourced data layer on top of the static services directory:
--   • service_corrections  — "something is wrong with this page"
--   • service_wait_times   — "I waited X minutes at Y office"
--
-- Both are public-insert, public-read (aggregated) with anti-spam rate limiting
-- handled in the API route. No auth required (optional owner_id linked to auth.uid).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- CORRECTIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists service_corrections (
  id              uuid primary key default gen_random_uuid(),
  service_slug    text not null,
  field           text not null check (field in (
    'title','summary','documents','fees','steps','offices',
    'contact','officialUrl','general','other'
  )),
  message         text not null check (char_length(message) between 5 and 2000),
  suggested_value text,
  contact_email   text,
  owner_id        uuid references auth.users(id) on delete set null,
  ip_hash         text,
  user_agent      text,
  status          text not null default 'pending' check (status in ('pending','accepted','rejected','duplicate')),
  admin_note      text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create index if not exists service_corrections_slug_idx on service_corrections(service_slug);
create index if not exists service_corrections_status_idx on service_corrections(status);
create index if not exists service_corrections_created_idx on service_corrections(created_at desc);

alter table service_corrections enable row level security;

-- Anyone can insert (API route validates + rate limits).
drop policy if exists "service_corrections_insert_public" on service_corrections;
create policy "service_corrections_insert_public"
  on service_corrections for insert
  with check (true);

-- Only owner or service role can read their own submissions; public cannot list.
drop policy if exists "service_corrections_read_owner" on service_corrections;
create policy "service_corrections_read_owner"
  on service_corrections for select
  using (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- WAIT TIMES
-- ─────────────────────────────────────────────────────────────
create table if not exists service_wait_times (
  id              uuid primary key default gen_random_uuid(),
  service_slug    text not null,
  office_name     text not null,
  office_index    int,                                -- position in services.offices array (optional)
  wait_minutes    int not null check (wait_minutes between 0 and 1440),
  visited_on      date not null default current_date,
  note            text check (char_length(coalesce(note,'')) <= 280),
  success         boolean,                            -- did the visit achieve the goal?
  owner_id        uuid references auth.users(id) on delete set null,
  ip_hash         text,
  created_at      timestamptz not null default now()
);

create index if not exists service_wait_times_slug_idx on service_wait_times(service_slug);
create index if not exists service_wait_times_slug_office_idx on service_wait_times(service_slug, office_name);
create index if not exists service_wait_times_created_idx on service_wait_times(created_at desc);

alter table service_wait_times enable row level security;

-- Anyone can insert (API validates).
drop policy if exists "service_wait_times_insert_public" on service_wait_times;
create policy "service_wait_times_insert_public"
  on service_wait_times for insert
  with check (true);

-- Public can read raw rows so the aggregate endpoint works via anon key.
drop policy if exists "service_wait_times_read_public" on service_wait_times;
create policy "service_wait_times_read_public"
  on service_wait_times for select
  using (true);

-- ─────────────────────────────────────────────────────────────
-- AGGREGATE HELPER
-- ─────────────────────────────────────────────────────────────
create or replace view service_wait_stats as
  select
    service_slug,
    office_name,
    count(*)::int                              as reports,
    round(avg(wait_minutes))::int              as avg_minutes,
    percentile_cont(0.5) within group (order by wait_minutes)::int as median_minutes,
    min(wait_minutes)                          as min_minutes,
    max(wait_minutes)                          as max_minutes,
    round(avg(case when success then 1.0 else 0.0 end) * 100)::int as success_pct,
    max(created_at)                            as last_report_at
  from service_wait_times
  where created_at >= now() - interval '180 days'
  group by service_slug, office_name;

comment on view service_wait_stats is
  'Rolling 180-day wait time stats per (service, office). Read by /api/services/wait-times.';
