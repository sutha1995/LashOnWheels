create or replace function public.booking_message_is_allowed(p_body text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    regexp_replace(coalesce(p_body, ''), '[^0-9]', '', 'g') !~ '[0-9]{7,}'
    and lower(coalesce(p_body, '')) !~ '(whatsapp|wa[.]me|call[[:space:]]+me|text[[:space:]]+me|contact[[:space:]]+me|message[[:space:]]+me|my[[:space:]]+(phone|number))';
$$;

alter policy "Booking participants can send messages"
  on public.booking_messages
  with check (
    sender_id = (select auth.uid())
    and public.booking_message_is_allowed(body)
    and exists (
      select 1
      from public.bookings
      where bookings.id = booking_messages.booking_id
        and (bookings.customer_id = (select auth.uid()) or bookings.freelancer_id = (select auth.uid()))
        and bookings.status <> 'cancelled'
    )
  );

revoke all on function public.booking_message_is_allowed(text) from public;
grant execute on function public.booking_message_is_allowed(text) to authenticated;
