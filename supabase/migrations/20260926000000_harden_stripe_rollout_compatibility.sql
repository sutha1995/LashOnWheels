drop function if exists public.claim_booking_checkout(uuid, uuid, text);

create function public.claim_booking_checkout(
  p_booking_id uuid,
  p_customer_id uuid,
  p_claim_token text
)
returns table (
  claimed boolean,
  payment_reference text,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
  claim_timestamp timestamptz;
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
      return query select false, null::text, booking_row.payment_checkout_claimed_at;
      return;
    end if;

    if booking_row.payment_reference like 'cs_%' then
      return query select false, booking_row.payment_reference, booking_row.payment_checkout_claimed_at;
      return;
    end if;

    if booking_row.payment_checkout_claimed_at is null
      or booking_row.payment_checkout_claimed_at > now() - interval '15 minutes' then
      return query select false, booking_row.payment_reference, booking_row.payment_checkout_claimed_at;
      return;
    end if;

    update public.bookings
    set payment_checkout_claimed_at = now()
    where id = p_booking_id
    returning payment_checkout_claimed_at into claim_timestamp;

    return query select true, booking_row.payment_reference, claim_timestamp;
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
  where id = p_booking_id
  returning payment_checkout_claimed_at into claim_timestamp;

  return query select true, p_claim_token, claim_timestamp;
end;
$$;

revoke all on function public.claim_booking_checkout(uuid, uuid, text) from public;
grant execute on function public.claim_booking_checkout(uuid, uuid, text) to service_role;

create or replace function public.release_booking_checkout(
  p_booking_id uuid,
  p_claim_token text,
  p_claimed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can release checkout.';
  end if;

  update public.bookings
  set
    payment_status = 'failed',
    payment_provider = 'stripe',
    payment_reference = p_claim_token,
    payment_checkout_claimed_at = null
  where id = p_booking_id
    and payment_status = 'pending'
    and payment_reference = p_claim_token
    and payment_checkout_claimed_at = p_claimed_at;

  return found;
end;
$$;

revoke all on function public.release_booking_checkout(uuid, text, timestamptz) from public;
grant execute on function public.release_booking_checkout(uuid, text, timestamptz) to service_role;

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
    or booking_row.payment_status = 'failed' and p_payment_status = 'pending'
    or booking_row.payment_reference is null
    or (
      booking_row.payment_reference <> p_session_id
      and (p_claim_token is null or booking_row.payment_reference <> p_claim_token)
    ) then
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
