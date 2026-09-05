create table public.freelancer_availability (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_available boolean not null default false,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (freelancer_id, day_of_week),
  check (end_time > start_time)
);

alter table public.freelancer_availability enable row level security;

create policy "Freelancers can view their own availability"
  on public.freelancer_availability for select
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      join public.freelancer_profiles on freelancer_profiles.id = profiles.id
      where profiles.id = (select auth.uid())
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can create their own availability"
  on public.freelancer_availability for insert
  with check (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      join public.freelancer_profiles on freelancer_profiles.id = profiles.id
      where profiles.id = (select auth.uid())
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can update their own availability"
  on public.freelancer_availability for update
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      join public.freelancer_profiles on freelancer_profiles.id = profiles.id
      where profiles.id = (select auth.uid())
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  )
  with check (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      join public.freelancer_profiles on freelancer_profiles.id = profiles.id
      where profiles.id = (select auth.uid())
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can delete their own availability"
  on public.freelancer_availability for delete
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      join public.freelancer_profiles on freelancer_profiles.id = profiles.id
      where profiles.id = (select auth.uid())
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create trigger freelancer_availability_updated_at
before update on public.freelancer_availability
for each row execute function public.set_updated_at();
