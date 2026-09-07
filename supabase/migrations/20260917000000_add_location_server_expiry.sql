create or replace function public.get_freelancer_location(p_booking_id uuid)
returns table (
  booking_id uuid,
  freelancer_id uuid,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  sharing_enabled boolean,
  updated_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    freelancer_locations.booking_id,
    freelancer_locations.freelancer_id,
    freelancer_locations.latitude,
    freelancer_locations.longitude,
    freelancer_locations.accuracy_meters,
    freelancer_locations.sharing_enabled,
    freelancer_locations.updated_at,
    freelancer_locations.updated_at + interval '2 minutes',
    now()
  from public.freelancer_locations
  where freelancer_locations.booking_id = p_booking_id;
$$;

revoke all on function public.get_freelancer_location(uuid) from public;
grant execute on function public.get_freelancer_location(uuid) to authenticated;
