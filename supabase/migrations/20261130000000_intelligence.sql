-- Intelligence layer: post-session mood (correlated with results), opponent profiles that
-- sync like every other table, and hands linked to opponents (array on the hand, like
-- collection_ids, so one row syncs).

alter table public.sessions add column if not exists mood smallint check (mood between 1 and 5);

alter table public.hands add column if not exists opponent_ids uuid[] not null default '{}';

alter table public.opponents add column if not exists style text
  check (style is null or style in ('unknown', 'tight_passive', 'tight_aggressive', 'loose_passive', 'loose_aggressive', 'maniac', 'rock', 'calling_station'));
alter table public.opponents add column if not exists traits jsonb not null default '{}'::jsonb;
alter table public.opponents add column if not exists avatar text check (avatar is null or char_length(avatar) <= 8);

create trigger opponents_tombstone after delete on public.opponents
  for each row execute function public.record_tombstone();
