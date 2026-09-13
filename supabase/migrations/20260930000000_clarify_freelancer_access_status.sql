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

  select * into result from public.profiles where id = auth.uid();
  if not found then
    raise exception 'Your profile is still being created. Refresh and try again.';
  end if;

  if result.suspended_at is not null then
    raise exception 'This account is suspended.';
  end if;

  if result.role = 'admin' then
    raise exception 'Administrator accounts cannot request freelancer access.';
  end if;

  if result.role = 'customer' then
    update public.profiles
    set requested_role = 'freelancer'
    where id = auth.uid()
    returning * into result;
  end if;

  return result;
end;
$$;

revoke all on function public.request_freelancer_access() from public;
grant execute on function public.request_freelancer_access() to authenticated;
