drop policy if exists "Freelancers can view their own services" on public.freelancer_services;
drop policy if exists "Freelancers can create their own services" on public.freelancer_services;
drop policy if exists "Freelancers can update their own services" on public.freelancer_services;
drop policy if exists "Freelancers can delete their own services" on public.freelancer_services;

create policy "Freelancers can view their own services"
  on public.freelancer_services for select
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

create policy "Freelancers can create their own services"
  on public.freelancer_services for insert
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

create policy "Freelancers can update their own services"
  on public.freelancer_services for update
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

create policy "Freelancers can delete their own services"
  on public.freelancer_services for delete
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
