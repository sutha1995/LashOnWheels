alter table public.services add column if not exists catalog_image_url text;
update public.services set catalog_image_url = case
  when name ilike '%lift%' or name ilike '%tint%' then 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80'
  when name ilike '%volume%' then 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
  else 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80'
end where catalog_image_url is null;

alter table public.freelancer_portfolio_photos add column if not exists style_tag text not null default '' check (char_length(style_tag) <= 60);

create or replace function public.can_add_portfolio_photo(p_freelancer_id uuid) returns boolean language sql security definer set search_path = public as $$
  select auth.uid() = p_freelancer_id and (select count(*) from public.freelancer_portfolio_photos where freelancer_id = p_freelancer_id) < 12;
$$;
drop policy if exists "Freelancers can create their own portfolio photos" on public.freelancer_portfolio_photos;
create policy "Freelancers can create up to twelve portfolio photos" on public.freelancer_portfolio_photos for insert with check (
  public.can_add_portfolio_photo(freelancer_id)
  and exists (select 1 from public.profiles join public.freelancer_profiles on freelancer_profiles.id = profiles.id where profiles.id = auth.uid() and freelancer_profiles.onboarding_completed and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer'))
);
