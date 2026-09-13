-- Suggested core catalogue. Freelancers set their own final price, duration, and offering details.
insert into public.services (category_id, name, description, duration_minutes, base_price)
select category.id, seed.name, seed.description, seed.duration_minutes, seed.base_price
from (
  values
    ('Hybrid Lash Extension', 'A balanced mix of classic lashes and light volume fans for soft texture.', 135, 150.00),
    ('Volume Lash Extension', 'Lightweight volume fans for a fuller, more defined lash look.', 150, 180.00),
    ('Mega Volume Lash Extension', 'A dramatic, dense volume style tailored to the desired finish.', 180, 220.00),
    ('Lash Lift + Tint', 'A curl-enhancing lash lift paired with tint for a more defined natural look.', 75, 100.00),
    ('Lash Extension Refill', 'A maintenance appointment to refresh existing extensions where suitable.', 90, 90.00),
    ('Lash Extension Removal', 'Professional removal of existing lash extensions.', 30, 30.00)
) as seed(name, description, duration_minutes, base_price)
cross join (
  select id from public.service_categories where slug = 'lash'
) as category
where not exists (
  select 1 from public.services existing where existing.category_id = category.id and existing.name = seed.name
);
