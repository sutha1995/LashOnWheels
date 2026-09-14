-- Optional, appointment-specific information. This is deliberately not stored on a public customer profile.
create table if not exists public.booking_health_disclosures (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  allergies text not null default '',
  medications text not null default '',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (char_length(allergies) <= 1000),
  check (char_length(medications) <= 1000)
);

alter table public.booking_health_disclosures enable row level security;

create policy "Customers can view their appointment health disclosure"
  on public.booking_health_disclosures for select using (auth.uid() = customer_id);

create policy "Assigned freelancers can view appointment health disclosures"
  on public.booking_health_disclosures for select using (
    exists (select 1 from public.bookings where bookings.id = booking_id and bookings.freelancer_id = auth.uid())
  );

drop function if exists public.create_booking(uuid, date, time, time, text, text, double precision, double precision);
create function public.create_booking(
  p_freelancer_service_id uuid,
  p_scheduled_date date,
  p_start_time time,
  p_end_time time,
  p_customer_note text default '',
  p_service_address text default '',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_allergies text default '',
  p_medications text default '',
  p_health_disclosure_consent boolean default false
)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare service_row record; booking_row public.bookings; day_of_week integer; health_details_present boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer' and suspended_at is null) then raise exception 'Only active customer accounts can create bookings.'; end if;
  if p_scheduled_date <= current_date or p_end_time <= p_start_time then raise exception 'Choose a future appointment with a valid time range.'; end if;
  if nullif(trim(p_service_address), '') is null or p_latitude is null or p_longitude is null then raise exception 'A service address and location are required.'; end if;
  health_details_present := nullif(trim(p_allergies), '') is not null or nullif(trim(p_medications), '') is not null;
  if health_details_present and not p_health_disclosure_consent then raise exception 'Consent is required before sharing health information with the assigned freelancer.'; end if;
  if char_length(coalesce(p_allergies, '')) > 1000 or char_length(coalesce(p_medications, '')) > 1000 then raise exception 'Health information must be 1,000 characters or fewer per field.'; end if;
  select fs.freelancer_id, fs.price, fs.duration_minutes, s.name as service_name, fp.travel_fee into service_row from public.freelancer_services fs join public.services s on s.id = fs.service_id join public.freelancer_profiles fp on fp.id = fs.freelancer_id join public.profiles p on p.id = fp.id where fs.id = p_freelancer_service_id and fs.active and s.active and fp.onboarding_completed and fp.verification_status = 'approved' and p.suspended_at is null;
  if not found then raise exception 'The selected service is not available.'; end if;
  if extract(epoch from (p_end_time - p_start_time)) / 60 <> service_row.duration_minutes then raise exception 'The selected time window must match the service duration.'; end if;
  day_of_week := extract(isodow from p_scheduled_date)::integer - 1;
  if not exists (select 1 from public.freelancer_availability a where a.freelancer_id = service_row.freelancer_id and a.day_of_week = day_of_week and a.is_available and p_start_time >= a.start_time and p_end_time <= a.end_time) then raise exception 'The freelancer is not available during that time.'; end if;
  perform pg_advisory_xact_lock(hashtext(service_row.freelancer_id::text || ':' || p_scheduled_date::text));
  if exists (select 1 from public.bookings b where b.freelancer_id = service_row.freelancer_id and b.scheduled_date = p_scheduled_date and b.status in ('pending', 'confirmed') and b.start_time < p_end_time and b.end_time > p_start_time) then raise exception 'That time is already booked.'; end if;
  insert into public.bookings (customer_id, freelancer_id, freelancer_service_id, scheduled_date, start_time, end_time, service_name, price, duration_minutes, customer_note, service_address, latitude, longitude, travel_fee, total_amount) values (auth.uid(), service_row.freelancer_id, p_freelancer_service_id, p_scheduled_date, p_start_time, p_end_time, service_row.service_name, service_row.price, service_row.duration_minutes, coalesce(trim(p_customer_note), ''), trim(p_service_address), p_latitude, p_longitude, service_row.travel_fee, service_row.price + service_row.travel_fee) returning * into booking_row;
  if health_details_present then insert into public.booking_health_disclosures (booking_id, customer_id, allergies, medications) values (booking_row.id, auth.uid(), coalesce(trim(p_allergies), ''), coalesce(trim(p_medications), '')); end if;
  return booking_row;
end; $$;
revoke all on function public.create_booking(uuid, date, time, time, text, text, double precision, double precision, text, text, boolean) from public;
grant execute on function public.create_booking(uuid, date, time, time, text, text, double precision, double precision, text, text, boolean) to authenticated;
