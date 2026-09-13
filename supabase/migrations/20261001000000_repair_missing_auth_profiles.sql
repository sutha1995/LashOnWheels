-- Backfill the app profile for authenticated users created before their client completed onboarding.
create or replace function public.request_freelancer_access()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  insert into public.profiles (id, full_name, phone, role, requested_role)
  select
    users.id,
    coalesce(users.raw_user_meta_data ->> 'full_name', ''),
    case
      when coalesce(users.raw_user_meta_data ->> 'phone', '') ~ '^\\+?[0-9 ()-]{7,20}$'
        then users.raw_user_meta_data ->> 'phone'
      else null
    end,
    'customer'::public.user_role,
    case
      when users.raw_user_meta_data ->> 'role' = 'freelancer' then 'freelancer'::public.user_role
      else 'customer'::public.user_role
    end
  from auth.users as users
  where users.id = auth.uid()
  on conflict (id) do nothing;

  select * into result from public.profiles where id = auth.uid();
  if not found then
    raise exception 'We could not initialize your profile. Please contact support.';
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
