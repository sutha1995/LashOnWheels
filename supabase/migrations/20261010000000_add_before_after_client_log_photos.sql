alter table public.freelancer_client_logs
  add column if not exists before_photo_path text,
  add column if not exists after_photo_path text;

comment on column public.freelancer_client_logs.before_photo_path is 'Private, camera-captured before-treatment photo.';
comment on column public.freelancer_client_logs.after_photo_path is 'Private, camera-captured after-treatment photo.';
