alter table public.settings add column if not exists list_deadline text default '';

update public.settings set list_deadline = coalesce(list_deadline, '') where id = 1;
