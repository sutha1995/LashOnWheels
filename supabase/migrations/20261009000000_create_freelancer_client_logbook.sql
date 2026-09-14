-- Private post-appointment treatment records. No contact, address, or payment fields are stored here.
create table if not exists public.freelancer_client_logs (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.freelancer_profiles(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  extension_style text not null default '',
  curl text not null default '',
  length_mm text not null default '',
  diameter_mm text not null default '',
  mapping_notes text not null default '',
  treatment_notes text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.freelancer_client_logs enable row level security;

create policy "Freelancers can view their private client logs"
  on public.freelancer_client_logs for select
  using (auth.uid() = freelancer_id);

create policy "Freelancers can create logs for their completed appointments"
  on public.freelancer_client_logs for insert
  with check (
    auth.uid() = freelancer_id
    and exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.freelancer_id = auth.uid()
        and bookings.status = 'completed'
    )
  );

create policy "Freelancers can update their private client logs"
  on public.freelancer_client_logs for update
  using (auth.uid() = freelancer_id)
  with check (
    auth.uid() = freelancer_id
    and exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.freelancer_id = auth.uid()
        and bookings.status = 'completed'
    )
  );

create trigger set_freelancer_client_logs_updated_at
  before update on public.freelancer_client_logs
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('client-logbook', 'client-logbook', false)
on conflict (id) do update set public = false;

create policy "Freelancers can upload private client log photos"
  on storage.objects for insert
  with check (
    bucket_id = 'client-logbook'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Freelancers can view their private client log photos"
  on storage.objects for select
  using (
    bucket_id = 'client-logbook'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
