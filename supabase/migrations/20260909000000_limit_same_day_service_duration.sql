update public.services
set duration_minutes = 1439
where duration_minutes = 1440;

update public.freelancer_services
set duration_minutes = 1439
where duration_minutes = 1440;

update public.bookings
set duration_minutes = 1439
where duration_minutes = 1440;

alter table public.services
  drop constraint services_duration_minutes_check,
  add constraint services_duration_minutes_check
    check (duration_minutes > 0 and duration_minutes <= 1439);

alter table public.freelancer_services
  drop constraint freelancer_services_duration_minutes_check,
  add constraint freelancer_services_duration_minutes_check
    check (duration_minutes > 0 and duration_minutes <= 1439);

alter table public.bookings
  drop constraint bookings_duration_minutes_check,
  add constraint bookings_duration_minutes_check
    check (duration_minutes > 0 and duration_minutes <= 1439);
