alter table if exists service_tasks
  add column if not exists assigned_department_key text;

alter table if exists service_tasks
  add column if not exists assigned_department_name text;

alter table if exists service_tasks
  add column if not exists assigned_office_name text;

alter table if exists service_tasks
  add column if not exists assigned_authority_level text;

alter table if exists service_tasks
  add column if not exists assigned_role_title text;

alter table if exists service_tasks
  add column if not exists routing_reason text;

alter table if exists service_tasks
  add column if not exists routing_confidence numeric(4,3);
