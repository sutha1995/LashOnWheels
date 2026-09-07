create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to cancel a booking.';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id
    and customer_id = auth.uid()
    and status in ('pending', 'confirmed')
  returning * into booking_row;

  if not found then
    raise exception 'This booking cannot be cancelled.';
  end if;

  return booking_row;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
