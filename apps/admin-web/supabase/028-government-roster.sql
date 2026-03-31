-- 028: Government Roster — tracks who holds which position
-- Auto-populated by sweep's roster extraction phase

create table if not exists government_roster (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ne text,
  title text not null,            -- e.g. "Minister of Finance"
  title_ne text,
  ministry text not null,         -- e.g. "Ministry of Finance"
  ministry_slug text,             -- e.g. "finance" (matches government bodies)
  appointed_date date,
  end_date date,                  -- null = still in office
  source_signal_id uuid,          -- signal that reported the appointment
  confidence float default 0.8,
  is_current boolean default true,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fast lookup for current officials
create index if not exists idx_roster_current
  on government_roster(is_current) where is_current = true;

-- Fast lookup by ministry
create index if not exists idx_roster_ministry_slug
  on government_roster(ministry_slug, is_current);

-- Prevent duplicate current entries for same ministry+title
create unique index if not exists idx_roster_unique_current
  on government_roster(ministry_slug, title) where is_current = true;

-- RLS
alter table government_roster enable row level security;

create policy "Public read access" on government_roster
  for select using (true);

create policy "Service role full access" on government_roster
  for all using (auth.role() = 'service_role');
