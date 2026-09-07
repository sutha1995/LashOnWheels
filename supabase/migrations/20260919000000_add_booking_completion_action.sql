create or replace function public.complete_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to complete a booking.';
  end if;

  if not exists (
    select 1
    from public.profiles
    join public.freelancer_profiles on freelancer_profiles.id = profiles.id
    where profiles.id = auth.uid()
      and freelancer_profiles.onboarding_completed
      and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
  ) then
    raise exception 'Only completed freelancer accounts can complete bookings.';
  end if;

  update public.bookings
  set status = 'completed'
  where id = p_booking_id
    and freelancer_id = auth.uid()
    and status = 'confirmed'
    and (scheduled_date + end_time) <= (current_timestamp at time zone 'Asia/Kuala_Lumpur')
  returning * into booking_row;

  if not found then
    raise exception 'Only your confirmed bookings can be completed.';
  end if;

  return booking_row;
end;
$$;

revoke all on function public.complete_booking(uuid) from public;
grant execute on function public.complete_booking(uuid) to authenticated;
