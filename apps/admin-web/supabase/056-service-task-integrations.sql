-- 056: Provider-backed integration ledger for service tasks
-- Connects payments and future provider callbacks back into task execution state.

alter table public.payments
  add column if not exists service_task_id uuid references public.service_tasks(id) on delete set null;

create index if not exists payments_service_task_id_idx on public.payments(service_task_id);

create table if not exists public.service_task_integrations (
  id uuid primary key default gen_random_uuid(),
  service_task_id uuid not null references public.service_tasks(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  provider_key text not null,
  operation text not null,
  status text not null check (status in ('pending', 'redirected', 'verified', 'failed')),
  payment_id uuid references public.payments(id) on delete set null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  provider_reference text,
  receipt_number text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists service_task_integrations_task_idx
  on public.service_task_integrations(service_task_id, created_at desc);
create index if not exists service_task_integrations_payment_idx
  on public.service_task_integrations(payment_id);
create index if not exists service_task_integrations_provider_idx
  on public.service_task_integrations(provider_key, operation, status);

alter table public.service_task_integrations enable row level security;

create policy "Users can read their own service task integrations"
  on public.service_task_integrations for select
  using (auth.uid() = owner_id);

create policy "Service role can manage all service task integrations"
  on public.service_task_integrations for all
  using (auth.role() = 'service_role');

create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  event_type text not null,
  provider_reference text,
  transaction_id text,
  verified boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  service_task_id uuid references public.service_tasks(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists provider_events_transaction_idx
  on public.provider_events(transaction_id);
create index if not exists provider_events_task_idx
  on public.provider_events(service_task_id, created_at desc);

alter table public.provider_events enable row level security;

create policy "Users can read their own provider events"
  on public.provider_events for select
  using (
    exists (
      select 1
      from public.service_tasks st
      where st.id = provider_events.service_task_id
        and st.owner_id = auth.uid()
    )
  );

create policy "Service role can manage all provider events"
  on public.provider_events for all
  using (auth.role() = 'service_role');
