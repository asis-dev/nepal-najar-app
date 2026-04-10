-- Nepal Republic — Step 3: SLA & escalation on counterparty routes
-- Step 4: Partner-facing reply tokens for low-friction adoption

-- ── SLA columns on routes ──────────────────────────────────────────────────

alter table service_counterparty_routes
  add column if not exists sla_target_hours integer,
  add column if not exists sla_warning_hours integer,
  add column if not exists escalation_policy text not null default 'none'
    check (escalation_policy in ('none', 'notify_manager', 'reassign', 'escalate_department', 'escalate_admin')),
  add column if not exists escalation_contact text,
  add column if not exists auto_follow_up boolean not null default false,
  add column if not exists follow_up_interval_hours integer default 48;

comment on column service_counterparty_routes.sla_target_hours is 'Expected resolution time in hours for this route';
comment on column service_counterparty_routes.sla_warning_hours is 'Hours before SLA breach to trigger warning';
comment on column service_counterparty_routes.escalation_policy is 'What happens when SLA is breached';
comment on column service_counterparty_routes.escalation_contact is 'Email/phone/name of escalation target';
comment on column service_counterparty_routes.auto_follow_up is 'Whether to auto-send follow-up to counterparty';
comment on column service_counterparty_routes.follow_up_interval_hours is 'Hours between auto follow-ups';

-- ── Partner reply tokens ───────────────────────────────────────────────────

create table if not exists service_partner_reply_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  counterparty_id uuid not null references service_counterparties(id) on delete cascade,
  task_id uuid not null references service_tasks(id) on delete cascade,
  route_id uuid references service_counterparty_routes(id) on delete set null,
  scope text not null default 'reply' check (scope in ('reply', 'status_update', 'document_upload', 'full')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 5,
  use_count integer not null default 0,
  is_revoked boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_partner_reply_tokens_lookup
  on service_partner_reply_tokens(token) where not is_revoked;

create index if not exists idx_partner_reply_tokens_task
  on service_partner_reply_tokens(task_id);

-- Partner reply log — every action taken through a reply link
create table if not exists service_partner_replies (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references service_partner_reply_tokens(id) on delete cascade,
  task_id uuid not null references service_tasks(id) on delete cascade,
  counterparty_id uuid not null references service_counterparties(id) on delete cascade,
  reply_type text not null default 'note' check (reply_type in ('note', 'status_update', 'document', 'rejection', 'approval', 'request_info')),
  content text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_replies_task
  on service_partner_replies(task_id, created_at desc);

-- RLS
alter table service_partner_reply_tokens enable row level security;
alter table service_partner_replies enable row level security;

-- Admin/verifier full access
drop policy if exists partner_reply_tokens_admin_all on service_partner_reply_tokens;
create policy partner_reply_tokens_admin_all on service_partner_reply_tokens
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'verifier'))
  );

drop policy if exists partner_replies_admin_all on service_partner_replies;
create policy partner_replies_admin_all on service_partner_replies
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'verifier'))
  );

-- Authenticated users can read tokens for their own tasks
drop policy if exists partner_reply_tokens_owner_select on service_partner_reply_tokens;
create policy partner_reply_tokens_owner_select on service_partner_reply_tokens
  for select using (
    exists (select 1 from service_tasks t where t.id = task_id and t.owner_id = auth.uid())
  );

-- Authenticated users can read replies on their own tasks
drop policy if exists partner_replies_owner_select on service_partner_replies;
create policy partner_replies_owner_select on service_partner_replies
  for select using (
    exists (select 1 from service_tasks t where t.id = task_id and t.owner_id = auth.uid())
  );

-- ── Step 5: Institution-specific pilot counterparties ──────────────────────

insert into service_counterparties (
  key, name, name_ne, department_key, kind, authority_level, jurisdiction_scope,
  service_category, adoption_stage, default_submission_mode, default_response_mode, notes
)
values
  -- District administration pilot
  ('dao-kathmandu', 'District Administration Office — Kathmandu', 'जिल्ला प्रशासन कार्यालय — काठमाडौं',
   'district-administration', 'government', 'district', 'Kathmandu District',
   'identity', 'pilot', 'department_inbox', 'department_inbox',
   'Primary pilot for citizenship by descent, recommendation letters, and migration certificates. High volume, good inbox adoption candidate.'),

  -- Municipality / ward pilot
  ('kathmandu-metro-ward-32', 'Kathmandu Metropolitan City — Ward 32', 'काठमाडौं महानगरपालिका — वडा नं. ३२',
   'district-administration', 'government', 'local', 'Kathmandu Ward 32',
   'identity', 'pilot', 'department_inbox', 'department_inbox',
   'Ward-level pilot for birth/death/marriage registration, recommendation letters, and local verification. Direct citizen contact point.'),

  -- Hospital desk pilot
  ('bir-hospital-opd-desk', 'Bir Hospital — OPD Registration Desk', 'वीर अस्पताल — बहिरंग विभाग दर्ता',
   'health', 'public_institution', 'provider', 'Kathmandu',
   'health', 'pilot', 'department_inbox', 'department_inbox',
   'OPD token booking, doctor queue, and referral tracking. High footfall, good fit for queue-based status updates.'),

  -- School / university admission pilot
  ('tu-exam-controller', 'Tribhuvan University — Office of the Controller of Examinations', 'त्रिभुवन विश्वविद्यालय — परीक्षा नियन्त्रक कार्यालय',
   'education', 'public_institution', 'federal', 'National',
   'education', 'pilot', 'portal_assisted', 'department_inbox',
   'Transcript requests, exam results, NOC for foreign study. Portal exists but is slow; inbox bridge captures status updates.')
on conflict (key) do update set
  name = excluded.name,
  name_ne = excluded.name_ne,
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

-- Channels for pilot institutions
insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge)
select id, 'inbox', 'bidirectional', 'NepalRepublic department inbox', true, false
from service_counterparties where key in ('dao-kathmandu', 'kathmandu-metro-ward-32', 'bir-hospital-opd-desk')
on conflict do nothing;

insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge)
select id, 'phone', 'bidirectional', 'Office phone line', false, true
from service_counterparties where key in ('dao-kathmandu', 'kathmandu-metro-ward-32', 'bir-hospital-opd-desk')
on conflict do nothing;

insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, endpoint, supports_status_sync, requires_human_bridge)
select id, 'portal', 'outbound', 'TU exam portal', 'https://exam.tu.edu.np', false, true
from service_counterparties where key = 'tu-exam-controller'
on conflict do nothing;

insert into service_counterparty_channels (counterparty_id, channel_type, direction, label, supports_status_sync, requires_human_bridge)
select id, 'inbox', 'bidirectional', 'NepalRepublic department inbox', true, false
from service_counterparties where key = 'tu-exam-controller'
on conflict do nothing;

-- Routes for pilot institutions
insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation,
  sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours,
  metadata
)
select 'citizenship-by-descent', 'district-administration', id, 200, true,
  'department_inbox', 'department_inbox', true, true, true, false,
  168, 120, 'notify_manager', true, 48,
  jsonb_build_object('strategy', 'Kathmandu DAO pilot: full inbox adoption. Citizen submits via NepalRepublic, DAO staff reply through inbox or reply link. 7-day SLA target.')
from service_counterparties where key = 'dao-kathmandu'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation,
  sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours,
  metadata
)
select 'birth-certificate', 'district-administration', id, 200, true,
  'department_inbox', 'department_inbox', true, true, true, false,
  72, 48, 'notify_manager', true, 24,
  jsonb_build_object('strategy', 'Ward 32 pilot: birth registration through inbox. Ward secretary verifies and responds. 3-day SLA.')
from service_counterparties where key = 'kathmandu-metro-ward-32'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation,
  sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours,
  metadata
)
select 'bir-hospital-opd', 'health', id, 200, true,
  'department_inbox', 'department_inbox', true, false, true, false,
  4, 2, 'escalate_department', false, null,
  jsonb_build_object('strategy', 'Bir Hospital OPD pilot: token booking and queue status through inbox. Same-day turnaround expected.')
from service_counterparties where key = 'bir-hospital-opd-desk'
on conflict do nothing;

insert into service_counterparty_routes (
  service_slug, department_key, counterparty_id, priority, is_primary, submission_mode, response_capture_mode,
  required_human_review, supports_document_exchange, supports_status_updates, supports_payment_confirmation,
  sla_target_hours, sla_warning_hours, escalation_policy, auto_follow_up, follow_up_interval_hours,
  metadata
)
select 'tu-transcript', 'education', id, 200, true,
  'portal_assisted', 'department_inbox', true, true, true, true,
  720, 480, 'notify_manager', true, 72,
  jsonb_build_object('strategy', 'TU transcript pilot: portal-assisted submission, inbox-based status tracking. 30-day SLA reflects institutional pace.')
from service_counterparties where key = 'tu-exam-controller'
on conflict do nothing;
