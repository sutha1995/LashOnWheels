create table public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.booking_reviews enable row level security;

create policy "Authenticated users can view booking reviews"
  on public.booking_reviews for select
  using (
    customer_id = (select auth.uid())
    or freelancer_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

revoke insert, update, delete on public.booking_reviews from authenticated;
grant select on public.booking_reviews to authenticated;

create or replace function public.create_booking_review(
  p_booking_id uuid,
  p_rating integer,
  p_comment text default ''
)
returns public.booking_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
  review_row public.booking_reviews;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to leave a review.';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  if char_length(coalesce(p_comment, '')) > 1000 then
    raise exception 'Review comments must be 1000 characters or fewer.';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
    and customer_id = auth.uid()
    and status = 'completed';

  if not found then
    raise exception 'Only completed bookings belonging to you can be reviewed.';
  end if;

  insert into public.booking_reviews (booking_id, customer_id, freelancer_id, rating, comment)
  values (booking_row.id, booking_row.customer_id, booking_row.freelancer_id, p_rating, coalesce(trim(p_comment), ''))
  returning * into review_row;

  return review_row;
exception
  when unique_violation then
    raise exception 'This booking has already been reviewed.';
end;
$$;

revoke all on function public.create_booking_review(uuid, integer, text) from public;
grant execute on function public.create_booking_review(uuid, integer, text) to authenticated;
