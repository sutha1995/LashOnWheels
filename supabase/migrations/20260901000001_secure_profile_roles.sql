alter table public.profiles
  add column requested_role public.user_role not null default 'customer';

update public.profiles
set requested_role = role;

drop policy "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id and role = 'customer' and requested_role <> 'admin');

drop policy "Users can update their own profile" on public.profiles;
