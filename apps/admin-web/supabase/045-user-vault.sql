-- Nepal Republic — User Document Vault (Phase 3 early)
-- Every Nepali's personal, private document locker. Retention hook.
-- Docs stored in private Supabase Storage bucket `user-vault`, metadata in this table.
-- RLS: row owner is the only read/write (server-role bypasses).

create table if not exists vault_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- What kind of doc (matches DOC_TYPES in lib/vault/types.ts)
  doc_type text not null check (doc_type in (
    'citizenship','passport','drivers_license','national_id',
    'pan','voter_id','bluebook','insurance','academic_certificate',
    'birth_certificate','marriage_certificate','land_dhani_purja','other'
  )),

  title text not null,                 -- user-editable display name
  number text,                         -- e.g. passport number, license number (encrypted ideally; text for MVP)
  issued_on date,
  expires_on date,

  storage_path text,                   -- path in Supabase Storage bucket
  file_name text,
  file_size int,
  mime_type text,

  notes text,
  tags text[] default '{}',

  -- Linked services for "this doc is needed for X" UI
  linked_service_slugs text[] default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_documents_owner_idx on vault_documents(owner_id, created_at desc);
create index if not exists vault_documents_expires_idx on vault_documents(expires_on) where expires_on is not null;

-- Auto update updated_at
create or replace function vault_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vault_documents_touch on vault_documents;
create trigger vault_documents_touch before update on vault_documents
  for each row execute function vault_touch_updated_at();

-- Reminders: optional row per doc that the user wants a heads-up for.
create table if not exists vault_reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references vault_documents(id) on delete cascade,

  reminder_type text not null default 'expiry',  -- 'expiry' | 'custom'
  remind_on date not null,                        -- trigger date (computed from expiry - days_before usually)
  days_before int default 30,
  channel text default 'in_app',                  -- 'in_app' | 'email' | 'sms' (future)
  message text,

  status text not null default 'pending' check (status in ('pending','sent','dismissed','failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists vault_reminders_owner_idx on vault_reminders(owner_id, remind_on);
create index if not exists vault_reminders_due_idx on vault_reminders(remind_on) where status = 'pending';

-- RLS
alter table vault_documents enable row level security;
alter table vault_reminders enable row level security;

drop policy if exists vault_documents_owner_all on vault_documents;
create policy vault_documents_owner_all on vault_documents
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists vault_reminders_owner_all on vault_reminders;
create policy vault_reminders_owner_all on vault_reminders
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ────────────────────────────────────────────────────────────
-- Storage bucket `user-vault` (run once; fails silently if already exists)
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('user-vault', 'user-vault', false)
on conflict (id) do nothing;

-- Storage policies: owner can CRUD own path; path prefix = user_id
drop policy if exists "vault owner read" on storage.objects;
create policy "vault owner read" on storage.objects for select
  using (bucket_id = 'user-vault' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vault owner insert" on storage.objects;
create policy "vault owner insert" on storage.objects for insert
  with check (bucket_id = 'user-vault' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vault owner update" on storage.objects;
create policy "vault owner update" on storage.objects for update
  using (bucket_id = 'user-vault' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vault owner delete" on storage.objects;
create policy "vault owner delete" on storage.objects for delete
  using (bucket_id = 'user-vault' and (storage.foldername(name))[1] = auth.uid()::text);
