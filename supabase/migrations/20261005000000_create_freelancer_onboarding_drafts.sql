create table public.freelancer_onboarding_drafts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.freelancer_onboarding_drafts enable row level security;

create policy "Freelancer applicants can view their own onboarding draft"
  on public.freelancer_onboarding_drafts for select
  using ((select auth.uid()) = user_id);

create policy "Freelancer applicants can create their own onboarding draft"
  on public.freelancer_onboarding_drafts for insert
  with check ((select auth.uid()) = user_id);

create policy "Freelancer applicants can update their own onboarding draft"
  on public.freelancer_onboarding_drafts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Freelancer applicants can delete their own onboarding draft"
  on public.freelancer_onboarding_drafts for delete
  using ((select auth.uid()) = user_id);

create trigger freelancer_onboarding_drafts_updated_at
before update on public.freelancer_onboarding_drafts
for each row execute function public.set_updated_at();
