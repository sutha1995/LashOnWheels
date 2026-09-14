create table public.freelancer_verification_documents (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('government_id', 'certificate')),
  storage_path text not null,
  file_name text not null default '',
  mime_type text not null default 'image/jpeg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (freelancer_id, document_type)
);

alter table public.freelancer_verification_documents enable row level security;

create policy "Freelancers can view their own verification documents"
  on public.freelancer_verification_documents for select
  using ((select auth.uid()) = freelancer_id);

create policy "Freelancers can add their own verification documents"
  on public.freelancer_verification_documents for insert
  with check ((select auth.uid()) = freelancer_id);

create policy "Freelancers can replace their own verification documents"
  on public.freelancer_verification_documents for update
  using ((select auth.uid()) = freelancer_id)
  with check ((select auth.uid()) = freelancer_id);

create policy "Admins can review verification documents"
  on public.freelancer_verification_documents for select
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));

create trigger freelancer_verification_documents_updated_at
before update on public.freelancer_verification_documents
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "Freelancers can upload their own verification files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-documents' and name like (select auth.uid()::text || '/%'));

create policy "Freelancers can view their own verification files"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and name like (select auth.uid()::text || '/%'));

create policy "Admins can view verification files"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));

create or replace function public.admin_set_freelancer_verification(p_freelancer_id uuid, p_status text, p_notes text default '')
returns public.freelancer_profiles language plpgsql security definer set search_path = public as $$
declare result public.freelancer_profiles;
begin
  perform public.require_admin();
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Invalid verification status.'; end if;
  if p_status = 'approved' and (
    not exists (select 1 from public.freelancer_verification_documents where freelancer_id = p_freelancer_id and document_type = 'government_id')
    or not exists (select 1 from public.freelancer_verification_documents where freelancer_id = p_freelancer_id and document_type = 'certificate')
  ) then raise exception 'Upload and review both an IC and a certificate before approval.'; end if;
  update public.freelancer_profiles set verification_status = p_status, verification_notes = coalesce(trim(p_notes), ''), verified_at = case when p_status = 'approved' then now() else null end where id = p_freelancer_id returning * into result;
  if not found then raise exception 'Freelancer profile not found.'; end if;
  return result;
end;
$$;
