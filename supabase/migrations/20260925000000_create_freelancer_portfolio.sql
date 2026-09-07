create table public.freelancer_portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  photo_url text not null,
  storage_path text not null,
  caption text not null default '' check (char_length(caption) <= 200),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index freelancer_portfolio_photos_freelancer_id_idx
  on public.freelancer_portfolio_photos (freelancer_id, position, created_at);

alter table public.freelancer_portfolio_photos enable row level security;

create policy "Freelancers can view their own portfolio photos"
  on public.freelancer_portfolio_photos for select
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Authenticated users can browse portfolio photos of completed freelancer profiles"
  on public.freelancer_portfolio_photos for select
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.freelancer_profiles
      where freelancer_profiles.id = freelancer_id
        and freelancer_profiles.onboarding_completed
    )
  );

create policy "Freelancers can create their own portfolio photos"
  on public.freelancer_portfolio_photos for insert
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

create policy "Freelancers can update their own portfolio photos"
  on public.freelancer_portfolio_photos for update
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

create policy "Freelancers can delete their own portfolio photos"
  on public.freelancer_portfolio_photos for delete
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

revoke insert, update, delete on public.freelancer_portfolio_photos from authenticated;
grant select on public.freelancer_portfolio_photos to authenticated;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "Public portfolio images are viewable" on storage.objects;
drop policy if exists "Freelancers can upload their own portfolio images" on storage.objects;
drop policy if exists "Freelancers can update their own portfolio images" on storage.objects;
drop policy if exists "Freelancers can delete their own portfolio images" on storage.objects;

create policy "Public portfolio images are viewable"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "Freelancers can upload their own portfolio images"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can update their own portfolio images"
  on storage.objects for update
  using (
    bucket_id = 'portfolio'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  )
  with check (
    bucket_id = 'portfolio'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can delete their own portfolio images"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );
