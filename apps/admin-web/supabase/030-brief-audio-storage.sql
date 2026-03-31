-- 030: Daily Brief Audio — TTS narration storage
-- Stores MP3 audio files of the daily brief read in Nepali

-- Add audio + video columns to daily_briefs table
alter table daily_briefs add column if not exists audio_url text;
alter table daily_briefs add column if not exists video_url text;
alter table daily_briefs add column if not exists audio_generated_at timestamptz;
alter table daily_briefs add column if not exists audio_duration_seconds int;

-- Create storage bucket for brief audio files
insert into storage.buckets (id, name, public)
values ('brief-audio', 'brief-audio', true)
on conflict (id) do nothing;

-- Public read access for brief audio
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read brief audio'
  ) then
    create policy "Public read brief audio" on storage.objects
      for select using (bucket_id = 'brief-audio');
  end if;
end $$;

-- Service role can upload
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Service upload brief audio'
  ) then
    create policy "Service upload brief audio" on storage.objects
      for insert with check (bucket_id = 'brief-audio' and auth.role() = 'service_role');
  end if;
end $$;

-- Service role can delete old audio
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Service delete brief audio'
  ) then
    create policy "Service delete brief audio" on storage.objects
      for delete using (bucket_id = 'brief-audio' and auth.role() = 'service_role');
  end if;
end $$;
