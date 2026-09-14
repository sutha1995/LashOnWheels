create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 3000),
  conversation jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can create their own support tickets"
  on public.support_tickets for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can view their own support tickets"
  on public.support_tickets for select
  using ((select auth.uid()) = user_id);

create policy "Admins can view all support tickets"
  on public.support_tickets for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'admin'
    )
  );

create trigger support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();
