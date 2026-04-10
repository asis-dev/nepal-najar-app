-- Nepal Republic — Counterparty registry for the government/provider side of service execution.
-- Models who receives requests, through what channel, and how responses come back.

create table if not exists service_counterparties (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  name_ne text,
  department_key text not null references service_departments(key) on delete cascade,
  kind text not null default 'government' check (kind in ('government', 'public_institution', 'private_institution', 'provider', 'partner')),
  authority_level text not null default 'provider' check (authority_level in ('local', 'district', 'provincial', 'federal', 'provider')),
  jurisdiction_scope text,
  service_category text,
  adoption_stage text not null default 'identified' check (adoption_stage in ('identified', 'outreach', 'pilot', 'active', 'blocked')),
  default_submission_mode text not null default 'manual' check (default_submission_mode in ('direct_api', 'portal_assisted', 'department_inbox', 'human_bridge', 'document_exchange', 'manual')),
  default_response_mode text not null default 'manual' check (default_response_mode in ('direct_api', 'portal_assisted', 'department_inbox', 'human_bridge', 'document_exchange', 'manual')),
  contact_email text,
  contact_phone text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_counterparties_department
  on service_counterparties(department_key, adoption_stage, is_active);

create table if not exists service_counterparty_channels (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references service_counterparties(id) on delete cascade,
  channel_type text not null check (channel_type in ('api', 'portal', 'inbox', 'email', 'phone', 'physical', 'webhook')),
  direction text not null default 'bidirectional' check (direction in ('outbound', 'inbound', 'bidirectional')),
  label text not null,
  endpoint text,
  supports_status_sync boolean not null default false,
  requires_human_bridge boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_counterparty_channels_counterparty
  on service_counterparty_channels(counterparty_id, is_active);

create table if not exists service_counterparty_routes (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  department_key text not null references service_departments(key) on delete cascade,
  counterparty_id uuid not null references service_counterparties(id) on delete cascade,
  office_name text,
  geography_scope text,
  priority integer not null default 100,
  is_primary boolean not null default false,
  submission_mode text not null default 'manual' check (submission_mode in ('direct_api', 'portal_assisted', 'department_inbox', 'human_bridge', 'document_exchange', 'manual')),
  response_capture_mode text not null default 'manual' check (response_capture_mode in ('direct_api', 'portal_assisted', 'department_inbox', 'human_bridge', 'document_exchange', 'manual')),
  required_human_review boolean not null default true,
  supports_document_exchange boolean not null default false,
  supports_status_updates boolean not null default false,
  supports_payment_confirmation boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_counterparty_routes_lookup
  on service_counterparty_routes(service_slug, department_key, priority desc, is_active);

create or replace function service_counterparties_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_counterparties_touch on service_counterparties;
create trigger trg_service_counterparties_touch before update on service_counterparties
  for each row execute function service_counterparties_touch_updated_at();

drop trigger if exists trg_service_counterparty_channels_touch on service_counterparty_channels;
create trigger trg_service_counterparty_channels_touch before update on service_counterparty_channels
  for each row execute function service_counterparties_touch_updated_at();

drop trigger if exists trg_service_counterparty_routes_touch on service_counterparty_routes;
create trigger trg_service_counterparty_routes_touch before update on service_counterparty_routes
  for each row execute function service_counterparties_touch_updated_at();

insert into service_counterparties (
  key, name, department_key, kind, authority_level, jurisdiction_scope, service_category, adoption_stage,
  default_submission_mode, default_response_mode, notes
)
values
  ('dotm-central', 'Department of Transport Management', 'transport', 'government', 'district', 'National', 'transport', 'identified', 'portal_assisted', 'portal_assisted', 'Strict identity and office-visit workflows. Good near-term fit for portal-assisted execution and status capture.'),
  ('department-of-passports', 'Department of Passports', 'passport', 'government', 'federal', 'National', 'identity', 'identified', 'portal_assisted', 'portal_assisted', 'Passport processing is strict and audit-heavy. Start with portal-assisted routing, voucher capture, and appointment/issuance tracking.'),
  ('district-administration-offices', 'District Administration Offices', 'district-administration', 'government', 'district', 'District', 'identity', 'pilot', 'department_inbox', 'department_inbox', 'Good fit for inbox-driven processing and clarification loops where official APIs do not exist.'),
  ('inland-revenue-department', 'Inland Revenue Department', 'tax', 'government', 'district', 'National', 'tax', 'identified', 'portal_assisted', 'portal_assisted', 'Tax workflows can begin as portal-assisted with structured payment and filing confirmation.'),
  ('nea-service-operations', 'Nepal Electricity Authority Service Operations', 'electricity', 'provider', 'provider', 'National', 'utilities', 'pilot', 'human_bridge', 'department_inbox', 'Good candidate for bill/complaint response sync once direct customer lookup exists.'),
  ('kukl-service-operations', 'Kathmandu Upatyaka Khanepani Limited', 'water', 'provider', 'provider', 'Kathmandu Valley', 'utilities', 'identified', 'human_bridge', 'department_inbox', 'Utility support, billing disputes, and service complaints can be piloted through queue-based response.'),
  ('hospital-partner-desk', 'Hospital Partner Desk', 'health', 'public_institution', 'provider', 'Institution-specific', 'health', 'pilot', 'department_inbox', 'department_inbox', 'Hospital triage and appointment desks need institution-specific queueing and response handling.')
on conflict (key) do update set
  name = excluded.name,
  department_key = excluded.department_key,
  kind = excluded.kind,
  authority_level = excluded.authority_level,
  jurisdiction_scope = excluded.jurisdiction_scope,
  service_category = excluded.service_category,
  adoption_stage = excluded.adoption_stage,
  default_submission_mode = excluded.default_submission_mode,
  default_response_mode = excluded.default_response_mode,
  notes = excluded.notes,
  is_active = true,
  updated_at = now();

insert into service_counterparty_channels (
  counterparty_id, channel_type, direction, label, endpoint, supports_status_sync, requires_human_bridge
)
select id, 'portal', 'bidirectional', 'Official portal', 'https://www.dotm.gov.np', false, true
from service_counterparties where key = 'dotm-central'
on conflict do nothing;

insert into service_counterparty_channels (
  counterparty_id, channel_type, direction, label, endpoint, supports_status_sync, requires_human_bridge
)
select id, 'portal', 'bidirectional', 'Passport portal', 'https://nepalpassport.gov.np', false, true
from service_counterparties where key = 'department-of-passports'
on conflict do nothing;

insert into service_counterparty_channels (
  counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge
)
select id, 'inbox', 'bidirectional', 'NepalRepublic department inbox', true, false
from service_counterparties where key in ('district-administration-offices', 'hospital-partner-desk')
on conflict do nothing;

insert into service_counterparty_channels (
  counterparty_id, channel_type, direction, label, endpoint, supports_status_sync, requires_human_bridge
)
select id, 'portal', 'bidirectional', 'IRD taxpayer portal', 'https://taxpayerportal.ird.gov.np', false, true
from service_counterparties where key = 'inland-revenue-department'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'drivers-license-renewal', 'transport', id, 150, true, 'portal_assisted', 'portal_assisted', true, true, false, true,
  jsonb_build_object('strategy', 'Capture booking, payment, biometrics, and issuance references while the official DoTM workflow stays authoritative.')
from service_counterparties where key = 'dotm-central'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'new-passport', 'passport', id, 150, true, 'portal_assisted', 'portal_assisted', true, true, false, true,
  jsonb_build_object('strategy', 'Passport remains strict; NepalRepublic handles intake, vouchers, appointment, and status continuity.')
from service_counterparties where key = 'department-of-passports'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'citizenship-by-descent', 'district-administration', id, 145, true, 'department_inbox', 'department_inbox', true, true, true, false,
  jsonb_build_object('strategy', 'Use NepalRepublic as the structured intake and clarification inbox for DAO-facing citizenship workflows.')
from service_counterparties where key = 'district-administration-offices'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'pan-individual', 'tax', id, 130, true, 'portal_assisted', 'portal_assisted', true, true, false, true,
  jsonb_build_object('strategy', 'File through the IRD portal, then pull references and payment confirmations back into the case.')
from service_counterparties where key = 'inland-revenue-department'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'nea-electricity-bill', 'electricity', id, 160, true, 'human_bridge', 'department_inbox', false, true, true, true,
  jsonb_build_object('strategy', 'Bridge lookup gaps through human-assisted queueing until direct account lookup and callback sync are fully wired.')
from service_counterparties where key = 'nea-service-operations'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation, metadata
)
select 'bir-hospital-opd', 'health', id, 170, true, 'department_inbox', 'department_inbox', true, true, true, false,
  jsonb_build_object('strategy', 'Hospital desks need intake clarification, slot notes, and token/status responses inside a shared queue.')
from service_counterparties where key = 'hospital-partner-desk'
on conflict do nothing;

alter table service_counterparties enable row level security;
alter table service_counterparty_channels enable row level security;
alter table service_counterparty_routes enable row level security;

drop policy if exists service_counterparties_select on service_counterparties;
create policy service_counterparties_select on service_counterparties
  for select using (true);

drop policy if exists service_counterparty_channels_select on service_counterparty_channels;
create policy service_counterparty_channels_select on service_counterparty_channels
  for select using (true);

drop policy if exists service_counterparty_routes_select on service_counterparty_routes;
create policy service_counterparty_routes_select on service_counterparty_routes
  for select using (true);

drop policy if exists service_counterparties_admin_all on service_counterparties;
create policy service_counterparties_admin_all on service_counterparties
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_counterparty_channels_admin_all on service_counterparty_channels;
create policy service_counterparty_channels_admin_all on service_counterparty_channels
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_counterparty_routes_admin_all on service_counterparty_routes;
create policy service_counterparty_routes_admin_all on service_counterparty_routes
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );
