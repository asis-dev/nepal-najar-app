-- Nepal Republic — pgvector RPC for services retrieval.
-- Called from lib/services/ai.ts via supabase.rpc('match_services', ...).

create or replace function match_services(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  id uuid,
  slug text,
  title_en text,
  title_ne text,
  similarity float
)
language sql stable
as $$
  select
    s.id,
    s.slug,
    s.title_en,
    s.title_ne,
    1 - (s.embedding <=> query_embedding) as similarity
  from services s
  where s.is_active = true and s.embedding is not null
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
