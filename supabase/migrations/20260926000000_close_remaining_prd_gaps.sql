-- Security, booking, and operations capabilities required by the PRD.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

alter table public.profiles
  add constraint profiles_phone_format_check
  check (phone is null or phone ~ '^\\+?[0-9 ()-]{7,20}$') not valid;

alter table public.freelancer_profiles
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_notes text not null default '',
  add column if not exists verified_at timestamptz,
  add column if not exists base_latitude double precision,
  add column if not exists base_longitude double precision;

alter table public.freelancer_profiles
  add constraint freelancer_profiles_verification_status_check
  check (verification_status in ('pending', 'approved', 'rejected')) not valid,
  add constraint freelancer_profiles_base_latitude_check
  check (base_latitude is null or base_latitude between -90 and 90) not valid,
  add constraint freelancer_profiles_base_longitude_check
  check (base_longitude is null or base_longitude between -180 and 180) not valid;

alter table public.bookings
  add column if not exists service_address text not null default '',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists travel_fee numeric(10, 2) not null default 0,
  add column if not exists total_amount numeric(10, 2) not null default 0,
  add column if not exists reschedule_count integer not null default 0;

update public.bookings
set total_amount = price + travel_fee
where total_amount = 0;

alter table public.bookings
  add constraint bookings_latitude_check check (latitude is null or latitude between -90 and 90) not valid,
  add constraint bookings_longitude_check check (longitude is null or longitude between -180 and 180) not valid,
  add constraint bookings_travel_fee_check check (travel_fee >= 0) not valid,
  add constraint bookings_total_amount_check check (total_amount = price + travel_fee) not valid,
  add constraint bookings_reschedule_count_check check (reschedule_count >= 0 and reschedule_count <= 3) not valid;

-- Only admin-approved freelancers can be discovered or booked.
drop policy if exists "Authenticated users can browse active freelancer services" on public.freelancer_services;
create policy "Authenticated users can browse approved freelancer services"
  on public.freelancer_services for select
  using (
    active
    and exists (
      select 1 from public.freelancer_profiles
      where freelancer_profiles.id = freelancer_id
        and freelancer_profiles.onboarding_completed
        and freelancer_profiles.verification_status = 'approved'
    )
  );

drop policy if exists "Authenticated users can browse completed freelancer profiles" on public.freelancer_profiles;
create policy "Authenticated users can browse approved freelancer profiles"
  on public.freelancer_profiles for select
  using (
    (select auth.uid()) is not null
    and onboarding_completed
    and verification_status = 'approved'
  );

drop function if exists public.create_booking(uuid, date, time, time, text);
create function public.create_booking(
  p_freelancer_service_id uuid,
  p_scheduled_date date,
  p_start_time time,
  p_end_time time,
  p_customer_note text default '',
  p_service_address text default '',
  p_latitude double precision default null,
  p_longitude double precision default null
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
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'customer' and suspended_at is null) then
    raise exception 'Only active customer accounts can create bookings.';
  end if;
  if p_scheduled_date <= current_date or p_end_time <= p_start_time then
    raise exception 'Choose a future appointment with a valid time range.';
  end if;
  if nullif(trim(p_service_address), '') is null then
    raise exception 'A service address is required.';
  end if;
  if p_latitude is null or p_longitude is null then
    raise exception 'A service location is required.';
  end if;
  select fs.freelancer_id, fs.price, fs.duration_minutes, s.name as service_name, fp.travel_fee
  into service_row
  from public.freelancer_services fs
  join public.services s on s.id = fs.service_id
  join public.freelancer_profiles fp on fp.id = fs.freelancer_id
  join public.profiles p on p.id = fp.id
  where fs.id = p_freelancer_service_id and fs.active and s.active
    and fp.onboarding_completed and fp.verification_status = 'approved' and p.suspended_at is null;
  if not found then raise exception 'The selected service is not available.'; end if;
  if extract(epoch from (p_end_time - p_start_time)) / 60 <> service_row.duration_minutes then raise exception 'The selected time window must match the service duration.'; end if;
  day_of_week := extract(isodow from p_scheduled_date)::integer - 1;
  if not exists (select 1 from public.freelancer_availability a where a.freelancer_id = service_row.freelancer_id and a.day_of_week = day_of_week and a.is_available and p_start_time >= a.start_time and p_end_time <= a.end_time) then raise exception 'The freelancer is not available during that time.'; end if;
  perform pg_advisory_xact_lock(hashtext(service_row.freelancer_id::text || ':' || p_scheduled_date::text));
  if exists (select 1 from public.bookings b where b.freelancer_id = service_row.freelancer_id and b.scheduled_date = p_scheduled_date and b.status in ('pending', 'confirmed') and b.start_time < p_end_time and b.end_time > p_start_time) then raise exception 'That time is already booked.'; end if;
  insert into public.bookings (customer_id, freelancer_id, freelancer_service_id, scheduled_date, start_time, end_time, service_name, price, duration_minutes, customer_note, service_address, latitude, longitude, travel_fee, total_amount)
  values (auth.uid(), service_row.freelancer_id, p_freelancer_service_id, p_scheduled_date, p_start_time, p_end_time, service_row.service_name, service_row.price, service_row.duration_minutes, coalesce(trim(p_customer_note), ''), trim(p_service_address), p_latitude, p_longitude, service_row.travel_fee, service_row.price + service_row.travel_fee)
  returning * into booking_row;
  return booking_row;
end;
$$;
revoke all on function public.create_booking(uuid, date, time, time, text, text, double precision, double precision) from public;
grant execute on function public.create_booking(uuid, date, time, time, text, text, double precision, double precision) to authenticated;

create or replace function public.reschedule_booking(p_booking_id uuid, p_scheduled_date date, p_start_time time, p_end_time time)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare booking_row public.bookings; day_of_week integer;
begin
  select * into booking_row from public.bookings where id = p_booking_id and customer_id = auth.uid() and status in ('pending', 'confirmed') for update;
  if not found then raise exception 'Only your active bookings can be rescheduled.'; end if;
  if booking_row.reschedule_count >= 3 or p_scheduled_date <= current_date or p_end_time <= p_start_time then raise exception 'This booking cannot be rescheduled to that time.'; end if;
  if extract(epoch from (p_end_time - p_start_time)) / 60 <> booking_row.duration_minutes then raise exception 'The selected time window must match the service duration.'; end if;
  day_of_week := extract(isodow from p_scheduled_date)::integer - 1;
  if not exists (select 1 from public.freelancer_availability a where a.freelancer_id = booking_row.freelancer_id and a.day_of_week = day_of_week and a.is_available and p_start_time >= a.start_time and p_end_time <= a.end_time) then raise exception 'The freelancer is not available during that time.'; end if;
  if exists (select 1 from public.bookings b where b.freelancer_id = booking_row.freelancer_id and b.id <> p_booking_id and b.scheduled_date = p_scheduled_date and b.status in ('pending', 'confirmed') and b.start_time < p_end_time and b.end_time > p_start_time) then raise exception 'That time is already booked.'; end if;
  update public.bookings set scheduled_date = p_scheduled_date, start_time = p_start_time, end_time = p_end_time, reschedule_count = reschedule_count + 1 where id = p_booking_id returning * into booking_row;
  return booking_row;
end;
$$;
revoke all on function public.reschedule_booking(uuid, date, time, time) from public;
grant execute on function public.reschedule_booking(uuid, date, time, time) to authenticated;

create or replace function public.require_admin() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and suspended_at is null) then raise exception 'Admin access is required.'; end if;
end;
$$;

create or replace function public.admin_set_freelancer_verification(p_freelancer_id uuid, p_status text, p_notes text default '') returns public.freelancer_profiles language plpgsql security definer set search_path = public as $$
declare result public.freelancer_profiles;
begin
  perform public.require_admin();
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Invalid verification status.'; end if;
  update public.freelancer_profiles set verification_status = p_status, verification_notes = coalesce(trim(p_notes), ''), verified_at = case when p_status = 'approved' then now() else null end where id = p_freelancer_id returning * into result;
  if not found then raise exception 'Freelancer profile not found.'; end if;
  return result;
end;
$$;

create or replace function public.admin_set_account_suspension(p_user_id uuid, p_suspend boolean, p_reason text default '') returns public.profiles language plpgsql security definer set search_path = public as $$
declare result public.profiles;
begin
  perform public.require_admin();
  if p_user_id = auth.uid() then raise exception 'You cannot suspend your own admin account.'; end if;
  update public.profiles set suspended_at = case when p_suspend then now() else null end, suspended_reason = case when p_suspend then nullif(trim(p_reason), '') else null end where id = p_user_id and role <> 'admin' returning * into result;
  if not found then raise exception 'Account not found or cannot be suspended.'; end if;
  return result;
end;
$$;

create or replace function public.admin_set_service_active(p_service_id uuid, p_active boolean) returns public.services language plpgsql security definer set search_path = public as $$
declare result public.services;
begin perform public.require_admin(); update public.services set active = p_active where id = p_service_id returning * into result; if not found then raise exception 'Service not found.'; end if; return result; end;
$$;

create or replace function public.admin_list_accounts()
returns table (id uuid, full_name text, phone text, requested_role public.user_role, suspended_at timestamptz, verification_status text, onboarding_completed boolean)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select p.id, p.full_name, p.phone, p.requested_role, p.suspended_at, fp.verification_status, coalesce(fp.onboarding_completed, false)
  from public.profiles p left join public.freelancer_profiles fp on fp.id = p.id
  where p.role <> 'admin' order by p.created_at desc;
end;
$$;

create or replace function public.admin_list_services()
returns setof public.services language plpgsql security definer set search_path = public as $$
begin perform public.require_admin(); return query select * from public.services order by name; end;
$$;

create or replace function public.admin_platform_metrics()
returns table (users_count bigint, freelancers_pending bigint, bookings_count bigint, gross_booking_value numeric)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select
    (select count(*) from public.profiles where role <> 'admin'),
    (select count(*) from public.freelancer_profiles where verification_status = 'pending'),
    (select count(*) from public.bookings),
    (select coalesce(sum(total_amount), 0) from public.bookings where payment_status = 'paid');
end;
$$;

alter table public.notifications drop constraint if exists notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check check (notification_type in ('booking_created', 'booking_status_changed', 'payment_status_changed', 'booking_reminder'));
create or replace function public.create_booking_reminders() returns integer language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
  select recipient_id, b.id, 'booking_reminder', 'Booking reminder', format('%s is scheduled tomorrow at %s.', b.service_name, b.start_time)
  from public.bookings b cross join lateral (values (b.customer_id), (b.freelancer_id)) recipients(recipient_id)
  where b.status = 'confirmed' and b.scheduled_date = current_date + 1
    and not exists (select 1 from public.notifications n where n.booking_id = b.id and n.recipient_id = recipients.recipient_id and n.notification_type = 'booking_reminder');
  get diagnostics inserted_count = row_count; return inserted_count;
end;
$$;
