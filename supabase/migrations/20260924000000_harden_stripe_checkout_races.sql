alter table public.bookings
  add column payment_checkout_claimed_at timestamptz;

create or replace function public.claim_booking_checkout(
  p_booking_id uuid,
  p_customer_id uuid,
  p_claim_token text
)
returns table (
  claimed boolean,
  payment_reference text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can claim checkout.';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.customer_id <> p_customer_id then
    raise exception 'Booking not found.';
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'Only confirmed bookings can be paid.';
  end if;

  if booking_row.payment_status = 'pending' then
    return query select false, booking_row.payment_reference;
    return;
  end if;

  if booking_row.payment_status not in ('unpaid', 'failed') then
    raise exception 'This booking is not available for payment.';
  end if;

  update public.bookings
  set
    payment_status = 'pending',
    payment_provider = 'stripe',
    payment_reference = p_claim_token,
    payment_checkout_claimed_at = now()
  where id = p_booking_id;

  return query select true, p_claim_token;
end;
$$;

revoke all on function public.claim_booking_checkout(uuid, uuid, text) from public;
grant execute on function public.claim_booking_checkout(uuid, uuid, text) to service_role;

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
    payment_checkout_claimed_at = case when p_payment_status = 'pending' then payment_checkout_claimed_at else null end,
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
    and payment_status <> 'pending'
  returning * into booking_row;

  if not found then
    raise exception 'This booking cannot be cancelled while payment is processing.';
  end if;

  return booking_row;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
