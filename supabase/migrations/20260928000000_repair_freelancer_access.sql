-- Repair projects that recorded the PRD migration before the suspension fields existed.
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

create or replace function public.request_freelancer_access()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  update public.profiles
  set requested_role = 'freelancer'
  where id = auth.uid()
    and role = 'customer'
    and suspended_at is null
  returning * into result;

  if not found then
    raise exception 'This account cannot request freelancer access.';
  end if;

  return result;
end;
$$;

revoke all on function public.request_freelancer_access() from public;
grant execute on function public.request_freelancer_access() to authenticated;
