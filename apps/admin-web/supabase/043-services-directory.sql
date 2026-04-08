-- Nepal Republic — Services Directory (Phase 1)
-- Turns Nepal Republic into an "everything app": directory of every gov/private/utility/health service Nepalis need.
-- Week 1: schema + seed + embeddings.

create extension if not exists vector;

-- Canonical service categories. Keep as check constraint (not FK) for seeding speed.
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in (
    'identity','transport','tax','health','utilities',
    'business','land','banking','education','legal'
  )),
  provider_type text not null check (provider_type in ('gov','private','bank','hospital','utility','telecom')),
  provider_name text not null,

  title_en text not null,
  title_ne text not null,
  summary_en text,
  summary_ne text,

  estimated_time text,      -- e.g. "2-3 hours" or "7 working days"
  fee_range text,           -- e.g. "Rs. 500 – 2,500"
  official_url text,

  -- jsonb for speed; normalize later if needed
  documents jsonb default '[]'::jsonb,         -- [{title_en, title_ne, required, notes_en, notes_ne}]
  steps jsonb default '[]'::jsonb,             -- [{order, title_en, title_ne, detail_en, detail_ne}]
  offices jsonb default '[]'::jsonb,           -- [{name_en, name_ne, address_en, address_ne, phone, lat, lng, hours}]
  common_problems jsonb default '[]'::jsonb,   -- [{problem_en, problem_ne, solution_en, solution_ne}]
  faqs jsonb default '[]'::jsonb,              -- [{q_en, q_ne, a_en, a_ne}]
  tags text[] default '{}',

  search_text tsvector,
  embedding vector(768),   -- Gemini text-embedding-004 dimension

  verified_at timestamptz,
  popularity int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists services_category_idx on services(category) where is_active;
create index if not exists services_slug_idx on services(slug);
create index if not exists services_search_idx on services using gin(search_text);
create index if not exists services_tags_idx on services using gin(tags);
create index if not exists services_embedding_idx on services using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- tsvector auto-update
create or replace function services_search_update() returns trigger as $$
begin
  new.search_text :=
    setweight(to_tsvector('simple', coalesce(new.title_en,'') || ' ' || coalesce(new.title_ne,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.summary_en,'') || ' ' || coalesce(new.summary_ne,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.provider_name,'')), 'C') ||
    setweight(to_tsvector('simple', array_to_string(new.tags, ' ')), 'C');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists services_search_trg on services;
create trigger services_search_trg before insert or update on services
  for each row execute function services_search_update();

-- Chat answer cache — same question in same locale served for free after first ask.
create table if not exists service_chat_cache (
  id uuid primary key default gen_random_uuid(),
  question_hash text not null,
  locale text not null check (locale in ('en','ne')),
  question text not null,
  answer text not null,
  cited_service_ids uuid[] default '{}',
  hits int default 1,
  model text,
  created_at timestamptz default now(),
  last_hit_at timestamptz default now(),
  unique (question_hash, locale)
);

create index if not exists service_chat_cache_hash_idx on service_chat_cache(question_hash, locale);

-- Lightweight analytics (works even if PostHog not configured)
create table if not exists service_events (
  id bigserial primary key,
  service_id uuid references services(id) on delete set null,
  event_type text not null,  -- view, search, ask, call, directions, share
  locale text,
  session_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists service_events_type_idx on service_events(event_type, created_at desc);
create index if not exists service_events_service_idx on service_events(service_id, created_at desc);

-- RLS: public read, server-only write
alter table services enable row level security;
alter table service_chat_cache enable row level security;
alter table service_events enable row level security;

drop policy if exists services_public_read on services;
create policy services_public_read on services for select using (is_active = true);

drop policy if exists service_chat_cache_public_read on service_chat_cache;
create policy service_chat_cache_public_read on service_chat_cache for select using (true);

-- Writes go through service-role key only (no policy = denied for anon).
