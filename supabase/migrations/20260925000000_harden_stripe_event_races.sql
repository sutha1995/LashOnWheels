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
    if booking_row.payment_reference is null then
      return query select false, null::text;
      return;
    end if;

    if booking_row.payment_reference like 'cs_%' then
      return query select false, booking_row.payment_reference;
      return;
    end if;

    if booking_row.payment_checkout_claimed_at is null
      or booking_row.payment_checkout_claimed_at > now() - interval '15 minutes' then
      return query select false, booking_row.payment_reference;
      return;
    end if;

    return query select true, booking_row.payment_reference;
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

create or replace function public.finalize_booking_checkout(
  p_booking_id uuid,
  p_claim_token text,
  p_session_id text
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
    raise exception 'Only the payment service can finalize checkout.';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found.';
  end if;

  if booking_row.status = 'cancelled' then
    raise exception 'Cancelled bookings cannot receive payment.';
  end if;

  if booking_row.payment_status in ('paid', 'failed') then
    return booking_row;
  end if;

  if booking_row.payment_reference not in (p_claim_token, p_session_id) then
    raise exception 'Checkout claim is no longer active.';
  end if;

  update public.bookings
  set
    payment_status = 'pending',
    payment_provider = 'stripe',
    payment_reference = p_session_id,
    payment_checkout_claimed_at = null
  where id = p_booking_id
  returning * into booking_row;

  return booking_row;
end;
$$;

revoke all on function public.finalize_booking_checkout(uuid, text, text) from public;
grant execute on function public.finalize_booking_checkout(uuid, text, text) to service_role;

create or replace function public.apply_stripe_payment_event(
  p_booking_id uuid,
  p_session_id text,
  p_claim_token text,
  p_payment_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can apply payment events.';
  end if;

  if p_payment_status not in ('pending', 'paid', 'failed') then
    raise exception 'Invalid Stripe payment status.';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found
    or booking_row.status = 'cancelled'
    or booking_row.status not in ('confirmed', 'completed')
    or booking_row.payment_status = 'paid'
    or booking_row.payment_reference is null
    or booking_row.payment_reference not in (p_session_id, p_claim_token) then
    return false;
  end if;

  update public.bookings
  set
    payment_status = p_payment_status,
    payment_provider = 'stripe',
    payment_reference = p_session_id,
    payment_checkout_claimed_at = null,
    paid_at = case when p_payment_status = 'paid' then coalesce(booking_row.paid_at, now()) else booking_row.paid_at end
  where id = p_booking_id;

  return true;
end;
$$;

revoke all on function public.apply_stripe_payment_event(uuid, text, text, text) from public;
grant execute on function public.apply_stripe_payment_event(uuid, text, text, text) to service_role;
