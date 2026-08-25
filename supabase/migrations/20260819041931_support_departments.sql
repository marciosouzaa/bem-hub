do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.assistants'::regclass
      and conname = 'assistants_organization_id_id_key'
  ) then
    alter table public.assistants
      add constraint assistants_organization_id_id_key
      unique (organization_id, id);
  end if;
end;
$$;

create table public.support_departments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  default_assistant_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint support_departments_organization_id_id_key
    unique (organization_id, id),
  constraint support_departments_default_assistant_fkey
    foreign key (organization_id, default_assistant_id)
    references public.assistants(organization_id, id)
    on delete set null (default_assistant_id),
  constraint support_departments_name_length_check
    check (char_length(btrim(name)) between 2 and 80),
  constraint support_departments_description_length_check
    check (description is null or char_length(description) <= 500),
  constraint support_departments_archive_state_check
    check (
      (is_active and archived_at is null)
      or (not is_active and archived_at is not null)
    )
);

create unique index support_departments_org_active_name_idx
  on public.support_departments(organization_id, lower(btrim(name)))
  where is_active;

create index support_departments_org_active_idx
  on public.support_departments(organization_id, is_active, lower(btrim(name)));

create index support_departments_default_assistant_idx
  on public.support_departments(organization_id, default_assistant_id)
  where default_assistant_id is not null;

alter table public.support_departments enable row level security;

create policy "support_departments_select_member"
on public.support_departments
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "support_departments_insert_admin"
on public.support_departments
for insert
to authenticated
with check (
  public.is_org_admin(organization_id)
  and created_by = (select auth.uid())
);

create policy "support_departments_update_admin"
on public.support_departments
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

revoke all on table public.support_departments
  from anon, authenticated;
grant select, insert on table public.support_departments
  to authenticated;
grant update (
  name,
  description,
  is_active,
  default_assistant_id,
  updated_at,
  archived_at
) on table public.support_departments
  to authenticated;
grant all on table public.support_departments
  to service_role;

create or replace function public.list_support_departments(
  target_organization_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', department.id,
        'name', department.name,
        'description', department.description,
        'isActive', department.is_active,
        'defaultAssistantId', department.default_assistant_id,
        'defaultAssistant', case
          when assistant.id is null then null
          else jsonb_build_object(
            'id', assistant.id,
            'name', assistant.name,
            'area', assistant.area
          )
        end,
        'updatedAt', department.updated_at
      )
      order by lower(department.name), department.id
    ),
    '[]'::jsonb
  )
  from public.support_departments department
  left join public.assistants assistant
    on assistant.organization_id = department.organization_id
    and assistant.id = department.default_assistant_id
  where department.organization_id = target_organization_id
    and department.is_active
    and public.is_org_member(target_organization_id);
$$;

revoke all on function public.list_support_departments(uuid)
  from public, anon, authenticated;
grant execute on function public.list_support_departments(uuid)
  to authenticated;

create or replace function public.save_support_department(
  target_organization_id uuid,
  target_department_id uuid,
  department_name text,
  department_description text,
  department_default_assistant_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := nullif(left(btrim(coalesce(department_name, '')), 80), '');
  normalized_description text :=
    nullif(left(btrim(coalesce(department_description, '')), 500), '');
  existing_department_id uuid;
  saved_department_id uuid;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  if normalized_name is null then
    raise exception 'support_department_name_required' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(department_name, ''))) > 80 then
    raise exception 'support_department_name_too_long' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(department_description, ''))) > 500 then
    raise exception 'support_department_description_too_long' using errcode = '22023';
  end if;

  if department_default_assistant_id is not null and not exists (
    select 1
    from public.assistants assistant
    where assistant.organization_id = target_organization_id
      and assistant.id = department_default_assistant_id
  ) then
    raise exception 'support_department_default_assistant_not_found'
      using errcode = '23503';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':support_department:' || lower(normalized_name),
      0
    )
  );

  select department.id
  into existing_department_id
  from public.support_departments department
  where department.organization_id = target_organization_id
    and department.is_active
    and lower(btrim(department.name)) = lower(normalized_name)
  limit 1;

  if target_department_id is null then
    if existing_department_id is not null then
      raise exception 'support_department_name_exists' using errcode = '23505';
    end if;

    insert into public.support_departments (
      organization_id,
      name,
      description,
      default_assistant_id,
      created_by
    ) values (
      target_organization_id,
      normalized_name,
      normalized_description,
      department_default_assistant_id,
      (select auth.uid())
    )
    returning id into saved_department_id;
  else
    if existing_department_id is not null
      and existing_department_id <> target_department_id then
      raise exception 'support_department_name_exists' using errcode = '23505';
    end if;

    update public.support_departments
    set
      name = normalized_name,
      description = normalized_description,
      default_assistant_id = department_default_assistant_id,
      updated_at = now()
    where id = target_department_id
      and organization_id = target_organization_id
      and is_active
    returning id into saved_department_id;

    if saved_department_id is null then
      raise exception 'support_department_not_found' using errcode = 'P0002';
    end if;
  end if;

  return jsonb_build_object('id', saved_department_id);
end;
$$;

revoke all on function public.save_support_department(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.save_support_department(uuid, uuid, text, text, uuid)
  to authenticated;

create or replace function public.archive_support_department(
  target_organization_id uuid,
  target_department_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  update public.support_departments
  set
    is_active = false,
    archived_at = now(),
    updated_at = now()
  where id = target_department_id
    and organization_id = target_organization_id
    and is_active;

  if not found then
    raise exception 'support_department_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_support_department(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.archive_support_department(uuid, uuid)
  to authenticated;
