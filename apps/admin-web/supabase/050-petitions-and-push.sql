-- Petitions + Web Push subscriptions
create extension if not exists "pgcrypto";

create table if not exists petitions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  title_ne      text,
  summary       text not null,
  summary_ne    text,
  body          text,
  body_ne       text,
  target_name   text,           -- e.g. "Minister of Energy"
  target_slug   text,
  goal          int not null default 1000,
  signature_count int not null default 0,
  creator_ip_hash text,
  creator_email text,
  status        text not null default 'published' check (status in ('draft','published','closed','rejected')),
  link          text,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index if not exists petitions_status_idx on petitions(status, created_at desc);
create index if not exists petitions_target_idx on petitions(target_slug);

create table if not exists petition_signatures (
  id           uuid primary key default gen_random_uuid(),
  petition_id  uuid not null references petitions(id) on delete cascade,
  ip_hash      text not null,
  display_name text,
  email        text,
  comment      text,
  created_at   timestamptz not null default now(),
  unique (petition_id, ip_hash)
);

create index if not exists petition_sigs_pid_idx on petition_signatures(petition_id, created_at desc);

create or replace function petitions_inc_count() returns trigger as $$
begin
  update petitions set signature_count = signature_count + 1 where id = new.petition_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists petition_sig_after_insert on petition_signatures;
create trigger petition_sig_after_insert
  after insert on petition_signatures
  for each row execute function petitions_inc_count();

alter table petitions enable row level security;
alter table petition_signatures enable row level security;

drop policy if exists "petitions_read_public" on petitions;
create policy "petitions_read_public" on petitions for select using (status = 'published');

drop policy if exists "petition_sigs_read_public" on petition_signatures;
create policy "petition_sigs_read_public" on petition_signatures for select using (true);

drop policy if exists "petition_sigs_insert_public" on petition_signatures;
create policy "petition_sigs_insert_public" on petition_signatures for insert with check (true);

-- Web Push subscriptions
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_id    uuid references auth.users(id) on delete set null,
  locale     text default 'en',
  topics     text[] default '{}',
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failed_count int not null default 0
);

create index if not exists push_subs_active_idx on push_subscriptions(failed_count)
  where failed_count < 5;

alter table push_subscriptions enable row level security;
drop policy if exists "push_subs_insert_public" on push_subscriptions;
create policy "push_subs_insert_public" on push_subscriptions for insert with check (true);
