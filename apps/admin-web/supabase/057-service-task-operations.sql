-- Nepal Republic — Service task operations backbone
-- Department/staff-side queueing, assignment, response, and approval for service cases.

alter table service_tasks
  add column if not exists queue_state text not null default 'new' check (queue_state in (
    'new',
    'assigned',
    'in_review',
    'waiting_on_citizen',
    'waiting_on_provider',
    'approved',
    'rejected',
    'escalated',
    'resolved',
    'closed'
  )),
  add column if not exists assigned_staff_user_id uuid references auth.users(id) on delete set null,
  add column if not exists first_response_due_at timestamptz,
  add column if not exists resolution_due_at timestamptz,
  add column if not exists first_staff_response_at timestamptz,
  add column if not exists last_public_update_at timestamptz,
  add column if not exists waiting_on_party text check (waiting_on_party is null or waiting_on_party in ('citizen', 'department', 'provider')),
  add column if not exists escalated_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0),
  add column if not exists resolution_summary text;

drop index if exists service_tasks_active_unique;
create unique index if not exists service_tasks_active_unique_v2
  on service_tasks (
    owner_id,
    service_slug,
    coalesce(target_member_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(answers->>'application_id', '__direct__')
  )
  where completed_at is null and status <> 'completed';

create index if not exists service_tasks_queue_idx
  on service_tasks(queue_state, assigned_department_key, resolution_due_at asc nulls last, updated_at desc);

create index if not exists service_tasks_staff_idx
  on service_tasks(assigned_staff_user_id, queue_state, updated_at desc);

create table if not exists service_departments (
  key text primary key,
  name text not null,
  name_ne text,
  description text,
  authority_level text not null default 'provider' check (authority_level in ('local', 'district', 'provincial', 'federal', 'provider')),
  default_queue_label text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_department_members (
  department_key text not null references service_departments(key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'case_worker' check (member_role in ('owner', 'manager', 'case_worker', 'reviewer', 'approver', 'viewer')),
  can_assign boolean not null default false,
  can_approve boolean not null default false,
  can_escalate boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (department_key, user_id)
);

create index if not exists idx_service_department_members_user
  on service_department_members(user_id, is_active);

create table if not exists service_workflow_policies (
  id uuid primary key default gen_random_uuid(),
  service_slug text,
  department_key text not null references service_departments(key) on delete cascade,
  queue_entry_state text not null default 'new' check (queue_entry_state in (
    'new',
    'assigned',
    'in_review',
    'waiting_on_citizen',
    'waiting_on_provider',
    'approved',
    'rejected',
    'escalated',
    'resolved',
    'closed'
  )),
  first_response_hours integer not null default 24 check (first_response_hours >= 1),
  resolution_hours integer not null default 168 check (resolution_hours >= 1),
  escalation_hours integer check (escalation_hours is null or escalation_hours >= 1),
  required_approval_role text check (required_approval_role is null or required_approval_role in ('owner', 'manager', 'reviewer', 'approver')),
  allow_transfer boolean not null default true,
  allow_rejection boolean not null default true,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_workflow_policies_lookup
  on service_workflow_policies(department_key, service_slug, is_active, priority desc);

create table if not exists service_task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references service_tasks(id) on delete cascade,
  department_key text not null references service_departments(key) on delete cascade,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  assignment_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz
);

create unique index if not exists idx_service_task_assignments_active_one
  on service_task_assignments(task_id)
  where is_active = true;

create index if not exists idx_service_task_assignments_department
  on service_task_assignments(department_key, is_active, created_at desc);

create index if not exists idx_service_task_assignments_assignee
  on service_task_assignments(assignee_user_id, is_active, created_at desc);

create table if not exists service_task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references service_tasks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('citizen', 'department', 'admin', 'system', 'provider')),
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  message_type text not null default 'note' check (message_type in ('note', 'request_info', 'status_update', 'decision', 'system')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_task_messages_task
  on service_task_messages(task_id, created_at desc);

create table if not exists service_task_decisions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references service_tasks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  department_key text references service_departments(key) on delete set null,
  decision_type text not null check (decision_type in ('accepted', 'requested_info', 'approved', 'rejected', 'escalated', 'transferred', 'resolved', 'closed')),
  previous_queue_state text,
  next_queue_state text,
  public_note text,
  internal_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_task_decisions_task
  on service_task_decisions(task_id, created_at desc);

create or replace function service_departments_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_departments_touch on service_departments;
create trigger trg_service_departments_touch before update on service_departments
  for each row execute function service_departments_touch_updated_at();

drop trigger if exists trg_service_workflow_policies_touch on service_workflow_policies;
create trigger trg_service_workflow_policies_touch before update on service_workflow_policies
  for each row execute function service_departments_touch_updated_at();

create or replace function service_task_assignments_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_task_assignments_touch on service_task_assignments;
create trigger trg_service_task_assignments_touch before update on service_task_assignments
  for each row execute function service_task_assignments_touch_updated_at();

insert into service_departments (key, name, authority_level, default_queue_label, description)
values
  ('transport', 'Department of Transport Management (DoTM)', 'district', 'Transport cases', 'Handles driving license and vehicle-related citizen service tasks.'),
  ('passport', 'Department of Passports', 'federal', 'Passport cases', 'Handles passport issuance and passport-related service tasks.'),
  ('district-administration', 'District Administration Office', 'district', 'District administration cases', 'Handles citizenship and district-administration service tasks.'),
  ('tax', 'Inland Revenue Department', 'district', 'Tax cases', 'Handles PAN and tax-related citizen services.'),
  ('electricity', 'Nepal Electricity Authority (NEA)', 'provider', 'Utility billing cases', 'Handles electricity billing and utility service cases.'),
  ('water', 'Kathmandu Upatyaka Khanepani Limited (KUKL)', 'provider', 'Water billing cases', 'Handles water billing and related service cases.'),
  ('health', 'Hospital & OPD Services', 'provider', 'Hospital appointment cases', 'Handles hospital appointment, OPD, and health service workflows.')
on conflict (key) do update set
  name = excluded.name,
  authority_level = excluded.authority_level,
  default_queue_label = excluded.default_queue_label,
  description = excluded.description,
  is_active = true,
  updated_at = now();

insert into service_workflow_policies (
  service_slug,
  department_key,
  queue_entry_state,
  first_response_hours,
  resolution_hours,
  escalation_hours,
  required_approval_role,
  priority,
  is_active
)
values
  ('drivers-license-renewal', 'transport', 'new', 12, 120, 48, 'approver', 150, true),
  ('new-passport', 'passport', 'new', 24, 240, 96, 'approver', 140, true),
  ('citizenship-by-descent', 'district-administration', 'new', 24, 240, 96, 'approver', 145, true),
  ('pan-individual', 'tax', 'new', 12, 96, 48, 'reviewer', 130, true),
  ('nea-electricity-bill', 'electricity', 'new', 4, 24, 12, 'reviewer', 160, true),
  ('kukl-water-bill', 'water', 'new', 6, 36, 18, 'reviewer', 150, true),
  ('bir-hospital-opd', 'health', 'new', 2, 24, 8, 'reviewer', 170, true),
  ('tuth-opd', 'health', 'new', 2, 24, 8, 'reviewer', 170, true),
  ('patan-hospital-opd', 'health', 'new', 2, 24, 8, 'reviewer', 170, true)
on conflict do nothing;

alter table service_departments enable row level security;
alter table service_department_members enable row level security;
alter table service_workflow_policies enable row level security;
alter table service_task_assignments enable row level security;
alter table service_task_messages enable row level security;
alter table service_task_decisions enable row level security;

drop policy if exists service_departments_select on service_departments;
create policy service_departments_select on service_departments
  for select using (true);

drop policy if exists service_workflow_policies_select on service_workflow_policies;
create policy service_workflow_policies_select on service_workflow_policies
  for select using (true);

drop policy if exists service_department_members_self_or_admin on service_department_members;
create policy service_department_members_self_or_admin on service_department_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_department_members_admin_all on service_department_members;
create policy service_department_members_admin_all on service_department_members
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_assignments_owner_or_staff on service_task_assignments;
create policy service_task_assignments_owner_or_staff on service_task_assignments
  for select using (
    exists (
      select 1 from service_tasks st
      where st.id = task_id and st.owner_id = auth.uid()
    )
    or assignee_user_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_assignments_admin_all on service_task_assignments;
create policy service_task_assignments_admin_all on service_task_assignments
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_messages_owner_or_staff on service_task_messages;
create policy service_task_messages_owner_or_staff on service_task_messages
  for select using (
    owner_id = auth.uid()
    or actor_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_messages_owner_insert on service_task_messages;
create policy service_task_messages_owner_insert on service_task_messages
  for insert with check (owner_id = auth.uid());

drop policy if exists service_task_messages_admin_all on service_task_messages;
create policy service_task_messages_admin_all on service_task_messages
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_decisions_owner_or_staff on service_task_decisions;
create policy service_task_decisions_owner_or_staff on service_task_decisions
  for select using (
    owner_id = auth.uid()
    or actor_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_decisions_admin_all on service_task_decisions;
create policy service_task_decisions_admin_all on service_task_decisions
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );
