create index if not exists support_departments_created_by_idx
  on public.support_departments(created_by)
  where created_by is not null;
