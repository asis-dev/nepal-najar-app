-- Nepal Republic — AI playbooks and AI run ledger for service operations.
-- This models where AI is allowed to act and creates an auditable queue for AI-assisted case work.

create table if not exists service_ai_playbooks (
  id uuid primary key default gen_random_uuid(),
  department_key text not null references service_departments(key) on delete cascade,
  service_slug text,
  playbook_key text not null,
  name text not null,
  description text,
  ai_role text not null default 'case_assistant',
  trigger_mode text not null default 'suggested' check (trigger_mode in ('manual', 'suggested', 'automatic')),
  priority integer not null default 100,
  objective text,
  allowed_tools jsonb not null default '[]'::jsonb,
  requires_human_approval boolean not null default true,
  can_contact_citizen boolean not null default false,
  can_contact_provider boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_key, playbook_key)
);

create index if not exists idx_service_ai_playbooks_lookup
  on service_ai_playbooks(department_key, service_slug, priority desc, is_active);

create table if not exists service_task_ai_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references service_tasks(id) on delete cascade,
  department_key text references service_departments(key) on delete set null,
  playbook_id uuid not null references service_ai_playbooks(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'blocked', 'cancelled')),
  summary text,
  input_context jsonb not null default '{}'::jsonb,
  output_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_service_task_ai_runs_task
  on service_task_ai_runs(task_id, created_at desc);

create index if not exists idx_service_task_ai_runs_status
  on service_task_ai_runs(status, created_at desc);

create or replace function service_ai_playbooks_touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_service_ai_playbooks_touch on service_ai_playbooks;
create trigger trg_service_ai_playbooks_touch before update on service_ai_playbooks
  for each row execute function service_ai_playbooks_touch_updated_at();

drop trigger if exists trg_service_task_ai_runs_touch on service_task_ai_runs;
create trigger trg_service_task_ai_runs_touch before update on service_task_ai_runs
  for each row execute function service_ai_playbooks_touch_updated_at();

insert into service_ai_playbooks (
  department_key, service_slug, playbook_key, name, description, ai_role, trigger_mode, priority, objective,
  allowed_tools, requires_human_approval, can_contact_citizen, can_contact_provider
)
values
  ('district-administration', null, 'intake-summarizer', 'Case intake summarizer', 'Condense citizen narrative, documents, and next blockers into a review-ready brief.', 'case_assistant', 'automatic', 180, 'Turn long citizen submissions into structured review notes and highlight missing evidence.', '["summarize","extract_fields","classify"]'::jsonb, true, false, false),
  ('district-administration', 'citizenship-by-descent', 'document-gap-checker', 'Citizenship document gap checker', 'Check if the case packet appears complete before staff review.', 'document_checker', 'suggested', 170, 'Flag missing parent documents, recommendation letters, and likely DAO blockers.', '["document_check","field_validation"]'::jsonb, true, false, false),
  ('tax', null, 'tax-followup-drafter', 'Tax follow-up drafter', 'Draft citizen-facing follow-up for missing fiscal info, payment proof, or filing mismatches.', 'followup_drafter', 'suggested', 150, 'Draft clear requests for missing filing data without letting AI approve the case.', '["draft_message","summarize"]'::jsonb, true, true, false),
  ('health', null, 'appointment-triage-assistant', 'Appointment triage assistant', 'Summarize symptoms or appointment need and prepare the desk handoff note.', 'triage_assistant', 'suggested', 160, 'Prepare cleaner handoff notes for hospital desks while leaving final medical triage to human staff.', '["summarize","classify"]'::jsonb, true, false, false),
  ('electricity', 'nea-electricity-bill', 'billing-dispute-router', 'Billing dispute router', 'Prepare dispute summaries, likely issue type, and required supporting bill evidence.', 'case_router', 'suggested', 140, 'Speed up utility complaint handling by packaging the issue clearly for provider staff.', '["summarize","extract_fields","classify"]'::jsonb, true, false, true)
on conflict (department_key, playbook_key) do update set
  service_slug = excluded.service_slug,
  name = excluded.name,
  description = excluded.description,
  ai_role = excluded.ai_role,
  trigger_mode = excluded.trigger_mode,
  priority = excluded.priority,
  objective = excluded.objective,
  allowed_tools = excluded.allowed_tools,
  requires_human_approval = excluded.requires_human_approval,
  can_contact_citizen = excluded.can_contact_citizen,
  can_contact_provider = excluded.can_contact_provider,
  is_active = true,
  updated_at = now();

alter table service_ai_playbooks enable row level security;
alter table service_task_ai_runs enable row level security;

drop policy if exists service_ai_playbooks_select on service_ai_playbooks;
create policy service_ai_playbooks_select on service_ai_playbooks
  for select using (true);

drop policy if exists service_task_ai_runs_staff_or_admin on service_task_ai_runs;
create policy service_task_ai_runs_staff_or_admin on service_task_ai_runs
  for select using (
    exists (
      select 1
      from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
    or exists (
      select 1
      from service_department_members m
      where m.user_id = auth.uid()
        and m.department_key = service_task_ai_runs.department_key
        and m.is_active = true
    )
  );

drop policy if exists service_ai_playbooks_admin_all on service_ai_playbooks;
create policy service_ai_playbooks_admin_all on service_ai_playbooks
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );

drop policy if exists service_task_ai_runs_admin_all on service_task_ai_runs;
create policy service_task_ai_runs_admin_all on service_task_ai_runs
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('admin', 'verifier')
    )
  );
