create table public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index booking_messages_booking_created_at_idx
  on public.booking_messages (booking_id, created_at asc);

alter table public.booking_messages enable row level security;

create policy "Booking participants can view messages"
  on public.booking_messages for select
  using (
    exists (
      select 1
      from public.bookings
      where bookings.id = booking_messages.booking_id
        and (bookings.customer_id = (select auth.uid()) or bookings.freelancer_id = (select auth.uid()))
    )
  );

create policy "Booking participants can send messages"
  on public.booking_messages for insert
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.bookings
      where bookings.id = booking_messages.booking_id
        and (bookings.customer_id = (select auth.uid()) or bookings.freelancer_id = (select auth.uid()))
        and bookings.status <> 'cancelled'
    )
  );

revoke update, delete on public.booking_messages from authenticated;
grant select, insert on public.booking_messages to authenticated;
