-- Some projects were linked after the original booking-location migration.
-- Keep the booking views and booking RPC compatible with those databases.
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
  drop constraint if exists bookings_latitude_check,
  drop constraint if exists bookings_longitude_check,
  drop constraint if exists bookings_travel_fee_check,
  drop constraint if exists bookings_total_amount_check,
  drop constraint if exists bookings_reschedule_count_check;

alter table public.bookings
  add constraint bookings_latitude_check check (latitude is null or latitude between -90 and 90) not valid,
  add constraint bookings_longitude_check check (longitude is null or longitude between -180 and 180) not valid,
  add constraint bookings_travel_fee_check check (travel_fee >= 0) not valid,
  add constraint bookings_total_amount_check check (total_amount = price + travel_fee) not valid,
  add constraint bookings_reschedule_count_check check (reschedule_count >= 0 and reschedule_count <= 3) not valid;
