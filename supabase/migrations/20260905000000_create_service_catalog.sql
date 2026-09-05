create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  base_price numeric(10, 2) not null check (base_price >= 0 and base_price <= 99999999.99),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.freelancer_services (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  price numeric(10, 2) not null check (price >= 0 and price <= 99999999.99),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (freelancer_id, service_id)
);

alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.freelancer_services enable row level security;

create policy "Authenticated users can view active service categories"
  on public.service_categories for select
  using ((select auth.uid()) is not null and active);

create policy "Authenticated users can view active services"
  on public.services for select
  using ((select auth.uid()) is not null and active);

create policy "Freelancers can view their own services"
  on public.freelancer_services for select
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can create their own services"
  on public.freelancer_services for insert
  with check (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can update their own services"
  on public.freelancer_services for update
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  )
  with check (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create policy "Freelancers can delete their own services"
  on public.freelancer_services for delete
  using (
    (select auth.uid()) = freelancer_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and (profiles.role = 'freelancer' or profiles.requested_role = 'freelancer')
    )
  );

create trigger services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger freelancer_services_updated_at
before update on public.freelancer_services
for each row execute function public.set_updated_at();

insert into public.service_categories (name, slug)
values ('Lash Services', 'lash')
on conflict (slug) do nothing;

insert into public.services (category_id, name, description, duration_minutes, base_price)
select category_id, name, description, duration_minutes, base_price
from (
  values
    ('Lash Lift', 'A natural lift for beautifully curled lashes.', 60, 80.00),
    ('Lash Tint', 'A rich tint to define your natural lashes.', 30, 45.00),
    ('Classic Lash Extension', 'Lightweight one-to-one extensions for everyday definition.', 120, 120.00)
) as seed(name, description, duration_minutes, base_price)
cross join (
  select id as category_id
  from public.service_categories
  where slug = 'lash'
) category
where not exists (
  select 1
  from public.services existing
  where existing.name = seed.name
    and existing.category_id = category.category_id
);
