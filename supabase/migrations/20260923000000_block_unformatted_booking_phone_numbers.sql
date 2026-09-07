create or replace function public.booking_message_is_allowed(p_body text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    coalesce(p_body, '') !~* '(^|[^0-9])[+][0-9][0-9 .()-]{6,}[0-9]([^0-9]|$)'
    and coalesce(p_body, '') !~* '(^|[^0-9])[(][0-9]{3}[)][ .-]?[0-9]{3}[ .-]?[0-9]{4}([^0-9]|$)'
    and coalesce(p_body, '') !~* '(^|[^0-9])[0-9]{3}[ .-][0-9]{3}[ .-][0-9]{4}([^0-9]|$)'
    and coalesce(p_body, '') !~* '(^|[^0-9])[0-9]{3}[ .-][0-9]{4}([^0-9]|$)'
    and coalesce(p_body, '') !~* '(^|[^0-9])[0-9]{7,15}([^0-9]|$)'
    and lower(coalesce(p_body, '')) !~ '(phone|number|call|text|whatsapp|wa)[^0-9]{0,12}[0-9]{7,15}'
    and lower(coalesce(p_body, '')) !~ '(whatsapp|wa[.]me|call[[:space:]]+me|text[[:space:]]+me|contact[[:space:]]+me|message[[:space:]]+me|my[[:space:]]+(phone|number))';
$$;
