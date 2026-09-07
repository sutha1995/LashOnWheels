drop policy "Customers can view shared locations for confirmed bookings"
  on public.freelancer_locations;

create policy "Customers can view fresh shared locations for confirmed bookings"
  on public.freelancer_locations for select
  using (
    sharing_enabled
    and updated_at > now() - interval '2 minutes'
    and exists (
      select 1
      from public.bookings
      where bookings.customer_id = (select auth.uid())
        and bookings.id = freelancer_locations.booking_id
        and bookings.freelancer_id = freelancer_locations.freelancer_id
        and bookings.status = 'confirmed'
    )
  );
