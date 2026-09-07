create or replace function public.confirm_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update a booking.';
  end if;

  if not exists (
    select 1
    from public.profiles
    join public.freelancer_profiles on freelancer_profiles.id = profiles.id
    where profiles.id = auth.uid()
      and freelancer_profiles.onboarding_completed
      and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
  ) then
    raise exception 'Only completed freelancer accounts can update bookings.';
  end if;

  update public.bookings
  set status = 'confirmed'
  where id = p_booking_id
    and freelancer_id = auth.uid()
    and status = 'pending'
  returning * into booking_row;

  if not found then
    raise exception 'This booking is no longer pending or is not assigned to you.';
  end if;

  return booking_row;
end;
$$;

create or replace function public.reject_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update a booking.';
  end if;

  if not exists (
    select 1
    from public.profiles
    join public.freelancer_profiles on freelancer_profiles.id = profiles.id
    where profiles.id = auth.uid()
      and freelancer_profiles.onboarding_completed
      and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
  ) then
    raise exception 'Only completed freelancer accounts can update bookings.';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id
    and freelancer_id = auth.uid()
    and status = 'pending'
  returning * into booking_row;

  if not found then
    raise exception 'This booking is no longer pending or is not assigned to you.';
  end if;

  return booking_row;
end;
$$;

revoke all on function public.confirm_booking(uuid) from public;
grant execute on function public.confirm_booking(uuid) to authenticated;

revoke all on function public.reject_booking(uuid) from public;
grant execute on function public.reject_booking(uuid) to authenticated;
