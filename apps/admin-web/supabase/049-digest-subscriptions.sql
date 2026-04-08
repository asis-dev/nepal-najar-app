-- Weekly digest email subscriptions
create extension if not exists "pgcrypto";

create table if not exists digest_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  locale        text not null default 'en' check (locale in ('en','ne')),
  topics        text[] not null default '{}',        -- optional filter: ministries/categories
  confirmed     boolean not null default true,        -- simple opt-in, no double opt-in for MVP
  unsub_token   text not null default encode(gen_random_bytes(16),'hex'),
  created_at    timestamptz not null default now(),
  last_sent_at  timestamptz,
  unique (email)
);

create index if not exists digest_subs_active_idx
  on digest_subscriptions(confirmed) where confirmed = true;

alter table digest_subscriptions enable row level security;

drop policy if exists "digest_subs_insert_public" on digest_subscriptions;
create policy "digest_subs_insert_public" on digest_subscriptions
  for insert with check (true);
-- reads/updates restricted to service role (default)
