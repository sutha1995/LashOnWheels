-- Repair freelancer-profile columns missing from partially applied PRD migrations.
alter table public.freelancer_profiles
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_notes text not null default '',
  add column if not exists verified_at timestamptz,
  add column if not exists base_latitude double precision,
  add column if not exists base_longitude double precision;

alter table public.freelancer_profiles
  drop constraint if exists freelancer_profiles_verification_status_check,
  drop constraint if exists freelancer_profiles_base_latitude_check,
  drop constraint if exists freelancer_profiles_base_longitude_check;

alter table public.freelancer_profiles
  add constraint freelancer_profiles_verification_status_check
    check (verification_status in ('pending', 'approved', 'rejected')) not valid,
  add constraint freelancer_profiles_base_latitude_check
    check (base_latitude is null or base_latitude between -90 and 90) not valid,
  add constraint freelancer_profiles_base_longitude_check
    check (base_longitude is null or base_longitude between -180 and 180) not valid;
