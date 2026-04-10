-- 055: Payments table for eSewa / Khalti integration
-- Stores payment records for service fees paid through the super-app.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  service_slug text not null,
  service_title text not null,
  gateway text not null check (gateway in ('esewa', 'khalti')),
  amount_npr integer not null,
  transaction_id text not null,
  gateway_ref text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  gateway_response jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes
create unique index if not exists payments_transaction_id_idx on public.payments(transaction_id);
create index if not exists payments_owner_id_idx on public.payments(owner_id);
create index if not exists payments_status_idx on public.payments(status);

-- RLS
alter table public.payments enable row level security;

create policy "Users can read their own payments"
  on public.payments for select
  using (auth.uid() = owner_id);

create policy "Service role can manage all payments"
  on public.payments for all
  using (auth.role() = 'service_role');
