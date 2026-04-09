-- Services super-app layer: identity profile, application tracker, form drafts
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. user_identity_profile
-- One row per user. Stores reusable personal data for autofilling
-- any government form (citizenship, passport, PAN, driver's license, etc).
-- Private by RLS. User can encrypt sensitive fields client-side later.
-- ─────────────────────────────────────────────────────────────
create table if not exists user_identity_profile (
  owner_id uuid primary key references auth.users(id) on delete cascade,

  -- Names
  full_name_en text,
  full_name_ne text,
  father_name_en text,
  father_name_ne text,
  mother_name_en text,
  mother_name_ne text,
  grandfather_name_en text,
  spouse_name_en text,

  -- Identifiers (user stores their own; never exposed to server except for their own queries)
  citizenship_no text,
  citizenship_issue_date date,
  citizenship_issue_district text,
  passport_no text,
  passport_expiry date,
  pan_no text,
  national_id_no text,
  voter_id_no text,
  driving_license_no text,

  -- Demographics
  date_of_birth date,
  gender text check (gender in ('male','female','other','prefer_not')),
  blood_group text,
  nationality text default 'Nepali',
  religion text,
  ethnicity text,
  marital_status text,

  -- Address — permanent
  permanent_province text,
  permanent_district text,
  permanent_municipality text,
  permanent_ward text,
  permanent_tole text,

  -- Address — temporary / current
  temporary_province text,
  temporary_district text,
  temporary_municipality text,
  temporary_ward text,
  temporary_tole text,

  -- Contact
  mobile text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,

  -- Occupation
  occupation text,
  employer text,
  annual_income_npr bigint,

  -- Preferences
  preferred_language text default 'ne' check (preferred_language in ('en','ne')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function identity_touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

drop trigger if exists user_identity_touch on user_identity_profile;
create trigger user_identity_touch before update on user_identity_profile
  for each row execute function identity_touch_updated_at();

alter table user_identity_profile enable row level security;

drop policy if exists "identity_select_own" on user_identity_profile;
create policy "identity_select_own" on user_identity_profile
  for select using (auth.uid() = owner_id);
drop policy if exists "identity_upsert_own" on user_identity_profile;
create policy "identity_upsert_own" on user_identity_profile
  for insert with check (auth.uid() = owner_id);
drop policy if exists "identity_update_own" on user_identity_profile;
create policy "identity_update_own" on user_identity_profile
  for update using (auth.uid() = owner_id);
drop policy if exists "identity_delete_own" on user_identity_profile;
create policy "identity_delete_own" on user_identity_profile
  for delete using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- 2. user_applications
-- Tracks ongoing gov applications — reference numbers, due dates,
-- status notes, reminders.
-- ─────────────────────────────────────────────────────────────
create table if not exists user_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  service_slug text not null,
  service_title text not null,
  service_category text,

  reference_no text,
  office_name text,
  office_url text,
  portal_url text,

  amount_npr numeric,
  paid boolean default false,
  paid_on date,
  receipt_no text,

  submitted_on date,
  expected_on date,
  completed_on date,

  status text not null default 'started'
    check (status in ('started','in_progress','submitted','pending_payment','pending_visit','ready_pickup','completed','rejected','cancelled')),
  last_status_note text,

  reminder_on date,
  reminder_sent boolean default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_owner_idx on user_applications(owner_id, updated_at desc);
create index if not exists applications_reminder_idx on user_applications(reminder_on) where reminder_sent = false and reminder_on is not null;

drop trigger if exists user_applications_touch on user_applications;
create trigger user_applications_touch before update on user_applications
  for each row execute function identity_touch_updated_at();

alter table user_applications enable row level security;
drop policy if exists "apps_select_own" on user_applications;
create policy "apps_select_own" on user_applications for select using (auth.uid() = owner_id);
drop policy if exists "apps_insert_own" on user_applications;
create policy "apps_insert_own" on user_applications for insert with check (auth.uid() = owner_id);
drop policy if exists "apps_update_own" on user_applications;
create policy "apps_update_own" on user_applications for update using (auth.uid() = owner_id);
drop policy if exists "apps_delete_own" on user_applications;
create policy "apps_delete_own" on user_applications for delete using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────
-- 3. service_form_drafts
-- Draft form data that can be saved offline and synced when online.
-- Data is JSONB for flexibility — each service can define its own schema.
-- ─────────────────────────────────────────────────────────────
create table if not exists service_form_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  service_slug text not null,
  form_key text not null,     -- e.g. 'passport-application', 'pan-individual'
  data jsonb not null default '{}'::jsonb,
  locale text default 'ne',
  submitted boolean default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, service_slug, form_key)
);
create index if not exists drafts_owner_idx on service_form_drafts(owner_id, updated_at desc);

drop trigger if exists form_drafts_touch on service_form_drafts;
create trigger form_drafts_touch before update on service_form_drafts
  for each row execute function identity_touch_updated_at();

alter table service_form_drafts enable row level security;
drop policy if exists "drafts_all_own" on service_form_drafts;
create policy "drafts_all_own" on service_form_drafts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
