create table public.freelancer_locations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters is null or accuracy_meters >= 0),
  sharing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.freelancer_locations enable row level security;

create policy "Freelancers can manage their own location"
  on public.freelancer_locations for all
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.bookings
      join public.freelancer_profiles on freelancer_profiles.id = bookings.freelancer_id
      join public.profiles on profiles.id = bookings.freelancer_id
      where bookings.id = freelancer_locations.booking_id
        and bookings.freelancer_id = (select auth.uid())
        and bookings.status = 'confirmed'
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  )
  with check (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.bookings
      join public.freelancer_profiles on freelancer_profiles.id = bookings.freelancer_id
      join public.profiles on profiles.id = bookings.freelancer_id
      where bookings.id = freelancer_locations.booking_id
        and bookings.freelancer_id = (select auth.uid())
        and bookings.status = 'confirmed'
        and freelancer_profiles.onboarding_completed
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Customers can view shared locations for confirmed bookings"
  on public.freelancer_locations for select
  using (
    sharing_enabled
    and exists (
      select 1
      from public.bookings
      where bookings.customer_id = (select auth.uid())
        and bookings.id = freelancer_locations.booking_id
        and bookings.freelancer_id = freelancer_locations.freelancer_id
        and bookings.status = 'confirmed'
    )
  );

create policy "Admins can view freelancer locations"
  on public.freelancer_locations for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create trigger freelancer_locations_updated_at
before update on public.freelancer_locations
for each row execute function public.set_updated_at();
