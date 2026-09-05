create table public.freelancer_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null default '',
  bio text not null default '',
  experience_years integer not null default 0 check (experience_years >= 0),
  service_area text not null default '',
  max_travel_distance_km numeric(6, 2) not null default 10 check (max_travel_distance_km > 0),
  travel_fee numeric(10, 2) not null default 0 check (travel_fee >= 0),
  profile_photo_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.freelancer_profiles enable row level security;

create policy "Freelancers can view their own profile"
  on public.freelancer_profiles for select
  using ((select auth.uid()) = id);

create policy "Freelancer applicants can create their own profile"
  on public.freelancer_profiles for insert
  with check (
    (select auth.uid()) = id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can update their own profile"
  on public.freelancer_profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create trigger freelancer_profiles_updated_at
before update on public.freelancer_profiles
for each row execute function public.set_updated_at();
