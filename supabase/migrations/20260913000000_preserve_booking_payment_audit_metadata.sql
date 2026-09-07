create or replace function public.set_booking_payment_status(
  p_booking_id uuid,
  p_payment_status text,
  p_payment_provider text default null,
  p_payment_reference text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can update payment status.';
  end if;

  if p_payment_status not in ('unpaid', 'pending', 'paid', 'failed', 'refunded') then
    raise exception 'Invalid payment status.';
  end if;

  update public.bookings
  set
    payment_status = p_payment_status,
    payment_provider = coalesce(nullif(trim(p_payment_provider), ''), public.bookings.payment_provider),
    payment_reference = coalesce(nullif(trim(p_payment_reference), ''), public.bookings.payment_reference),
    paid_at = case when p_payment_status = 'paid' then coalesce(public.bookings.paid_at, now()) else public.bookings.paid_at end
  where id = p_booking_id
  returning * into booking_row;

  if not found then
    raise exception 'Booking not found.';
  end if;

  return booking_row;
end;
$$;

revoke all on function public.set_booking_payment_status(uuid, text, text, text) from public;
grant execute on function public.set_booking_payment_status(uuid, text, text, text) to service_role;
