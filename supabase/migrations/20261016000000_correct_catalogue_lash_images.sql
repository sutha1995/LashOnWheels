-- Replace generic makeup imagery with lash-treatment stock samples.
update public.services set catalog_image_url = case
  when name ilike '%classic%' then 'https://images.pexels.com/photos/7446922/pexels-photo-7446922.jpeg?auto=compress&cs=tinysrgb&w=900'
  when name ilike '%hybrid%' then 'https://images.pexels.com/photos/34930118/pexels-photo-34930118.jpeg?auto=compress&cs=tinysrgb&w=900'
  when name ilike '%volume%' then 'https://images.pexels.com/photos/33637444/pexels-photo-33637444.jpeg?auto=compress&cs=tinysrgb&w=900'
  when name ilike '%lift%' or name ilike '%tint%' then 'https://images.unsplash.com/photo-1772235616130-b80e12f0ab7a?auto=format&fit=crop&w=900&q=80'
  else 'https://images.pexels.com/photos/29877726/pexels-photo-29877726.jpeg?auto=compress&cs=tinysrgb&w=900'
end;
