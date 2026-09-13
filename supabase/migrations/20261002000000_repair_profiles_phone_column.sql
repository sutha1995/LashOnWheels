-- Some early deployments recorded the PRD migration without adding this field.
alter table public.profiles
  add column if not exists phone text;
