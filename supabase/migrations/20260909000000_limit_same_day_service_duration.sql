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
