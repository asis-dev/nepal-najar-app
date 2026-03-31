-- 029: Constitution Articles — stores Nepal's 2015 constitution
-- Tracks amendments as new versioned rows

create table if not exists constitution_articles (
  id serial primary key,
  part_number int not null,
  part_title text not null,
  part_title_ne text,
  article_number int not null,
  article_title text not null,
  article_title_ne text,
  body_en text not null,
  body_ne text,
  schedule_number int,                    -- non-null for schedule items
  linked_promise_ids int[] default '{}',
  tags text[] default '{}',
  is_amended boolean default false,
  amendment_date date,
  amendment_note text,
  amendment_status text default 'current', -- 'current', 'proposed', 'superseded'
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lookup by article + version
create unique index if not exists idx_const_article_version
  on constitution_articles(article_number, version);

-- Full-text search on article content
create index if not exists idx_const_body_search
  on constitution_articles using gin(to_tsvector('english', body_en));

-- Find articles linked to specific commitments
create index if not exists idx_const_linked_promises
  on constitution_articles using gin(linked_promise_ids);

-- Filter by tags
create index if not exists idx_const_tags
  on constitution_articles using gin(tags);

-- Filter by part
create index if not exists idx_const_part
  on constitution_articles(part_number);

-- RLS
alter table constitution_articles enable row level security;

create policy "Public read access" on constitution_articles
  for select using (true);

create policy "Service role full access" on constitution_articles
  for all using (auth.role() = 'service_role');
