create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  notification_type text not null check (
    notification_type in ('booking_created', 'booking_status_changed', 'payment_status_changed')
  ),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using ((select auth.uid()) = recipient_id);

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_row public.notifications;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update notifications.';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_id = auth.uid()
  returning * into notification_row;

  if not found then
    raise exception 'Notification not found.';
  end if;

  return notification_row;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.create_booking_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    values
      (
        new.customer_id,
        new.id,
        'booking_created',
        'Booking request sent',
        format('%s on %s is waiting for freelancer confirmation.', new.service_name, new.scheduled_date)
      ),
      (
        new.freelancer_id,
        new.id,
        'booking_created',
        'New booking request',
        format('%s requested %s on %s.', new.service_name, new.start_time, new.scheduled_date)
      );

    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    select
      profiles.id,
      new.id,
      'booking_created',
      'New booking activity',
      format('A customer requested %s on %s.', new.service_name, new.scheduled_date)
    from public.profiles
    where profiles.role = 'admin';

    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    values
      (
        new.customer_id,
        new.id,
        'booking_status_changed',
        'Booking status updated',
        format('%s is now %s.', new.service_name, upper(new.status))
      ),
      (
        new.freelancer_id,
        new.id,
        'booking_status_changed',
        'Booking status updated',
        format('%s is now %s.', new.service_name, upper(new.status))
      );

    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    select
      profiles.id,
      new.id,
      'booking_status_changed',
      'Booking status updated',
      format('%s is now %s.', new.service_name, upper(new.status))
    from public.profiles
    where profiles.role = 'admin';
  end if;

  if new.payment_status is distinct from old.payment_status then
    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    values
      (
        new.customer_id,
        new.id,
        'payment_status_changed',
        'Payment status updated',
        format('%s payment is now %s.', new.service_name, upper(new.payment_status))
      ),
      (
        new.freelancer_id,
        new.id,
        'payment_status_changed',
        'Payment status updated',
        format('%s payment is now %s.', new.service_name, upper(new.payment_status))
      );

    insert into public.notifications (recipient_id, booking_id, notification_type, title, body)
    select
      profiles.id,
      new.id,
      'payment_status_changed',
      'Payment status updated',
      format('%s payment is now %s.', new.service_name, upper(new.payment_status))
    from public.profiles
    where profiles.role = 'admin';
  end if;

  return new;
end;
$$;

create trigger bookings_create_notifications
after insert or update of status, payment_status on public.bookings
for each row execute function public.create_booking_notifications();

revoke all on function public.create_booking_notifications() from public;
