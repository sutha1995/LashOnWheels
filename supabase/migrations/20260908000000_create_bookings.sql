create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  freelancer_service_id uuid not null references public.freelancer_services(id) on delete restrict,
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  service_name text not null,
  price numeric(10, 2) not null check (price >= 0 and price <= 99999999.99),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  customer_note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.bookings enable row level security;

create policy "Customers can view their own bookings"
  on public.bookings for select
  using ((select auth.uid()) = customer_id);

create policy "Freelancers can view their assigned bookings"
  on public.bookings for select
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

create policy "Admins can view all bookings"
  on public.bookings for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create trigger bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.create_booking(
  p_freelancer_service_id uuid,
  p_scheduled_date date,
  p_start_time time,
  p_end_time time,
  p_customer_note text default ''
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  service_row record;
  booking_row public.bookings;
  day_of_week integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a booking.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'customer'
  ) then
    raise exception 'Only customer accounts can create bookings.';
  end if;

  if p_scheduled_date < current_date then
    raise exception 'Bookings must be scheduled for a future date.';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'The booking end time must be after the start time.';
  end if;

  select
    fs.freelancer_id,
    fs.service_id,
    fs.price,
    fs.duration_minutes,
    s.name as service_name
  into service_row
  from public.freelancer_services fs
  join public.services s on s.id = fs.service_id
  join public.freelancer_profiles fp on fp.id = fs.freelancer_id
  where fs.id = p_freelancer_service_id
    and fs.active
    and s.active
    and fp.onboarding_completed;

  if not found then
    raise exception 'The selected service is not available.';
  end if;

  if extract(epoch from (p_end_time - p_start_time)) / 60 <> service_row.duration_minutes then
    raise exception 'The selected time window must match the service duration.';
  end if;

  day_of_week := extract(isodow from p_scheduled_date)::integer - 1;

  if not exists (
    select 1
    from public.freelancer_availability availability
    where availability.freelancer_id = service_row.freelancer_id
      and availability.day_of_week = day_of_week
      and availability.is_available
      and p_start_time >= availability.start_time
      and p_end_time <= availability.end_time
  ) then
    raise exception 'The freelancer is not available during that time.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(service_row.freelancer_id::text || ':' || p_scheduled_date::text)
  );

  if exists (
    select 1
    from public.bookings existing
    where existing.freelancer_id = service_row.freelancer_id
      and existing.scheduled_date = p_scheduled_date
      and existing.status in ('pending', 'confirmed')
      and existing.start_time < p_end_time
      and existing.end_time > p_start_time
  ) then
    raise exception 'That time is already booked.';
  end if;

  insert into public.bookings (
    customer_id,
    freelancer_id,
    freelancer_service_id,
    scheduled_date,
    start_time,
    end_time,
    service_name,
    price,
    duration_minutes,
    customer_note
  )
  values (
    auth.uid(),
    service_row.freelancer_id,
    p_freelancer_service_id,
    p_scheduled_date,
    p_start_time,
    p_end_time,
    service_row.service_name,
    service_row.price,
    service_row.duration_minutes,
    coalesce(trim(p_customer_note), '')
  )
  returning * into booking_row;

  return booking_row;
end;
$$;

revoke all on function public.create_booking(uuid, date, time, time, text) from public;
grant execute on function public.create_booking(uuid, date, time, time, text) to authenticated;

create policy "Authenticated users can browse active freelancer services"
  on public.freelancer_services for select
  using (
    active
    and exists (
      select 1
      from public.freelancer_profiles
      where freelancer_profiles.id = freelancer_id
        and freelancer_profiles.onboarding_completed
    )
  );

create policy "Authenticated users can browse completed freelancer profiles"
  on public.freelancer_profiles for select
  using (
    (select auth.uid()) is not null
    and onboarding_completed
  );

create policy "Authenticated users can browse freelancer availability"
  on public.freelancer_availability for select
  using (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.freelancer_profiles
      where freelancer_profiles.id = freelancer_id
        and freelancer_profiles.onboarding_completed
    )
  );
