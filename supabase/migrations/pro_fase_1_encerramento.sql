alter table public.settings
add column if not exists game_closed boolean default false;

alter table public.app_games
add column if not exists status text default 'closed';

update public.app_games
set status = coalesce(status, 'closed');
