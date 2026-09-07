-- Marketplace summary views expose only aggregate marketplace signals
-- (freelancer ratings and completed booking counts). Individual bookings
-- and review rows remain protected by their own row level security policies.

create view public.freelancer_rating_summaries
with (security_invoker = false)
as
select
  freelancer_id,
  avg(rating) as average_rating,
  count(*) as review_count
from public.booking_reviews
group by freelancer_id;

create view public.freelancer_completed_booking_summaries
with (security_invoker = false)
as
select
  freelancer_id,
  count(*) as completed_bookings
from public.bookings
where status = 'completed'
group by freelancer_id;

revoke all on public.freelancer_rating_summaries from public, anon, authenticated;
revoke all on public.freelancer_completed_booking_summaries from public, anon, authenticated;
grant select on public.freelancer_rating_summaries to authenticated;
grant select on public.freelancer_completed_booking_summaries to authenticated;
