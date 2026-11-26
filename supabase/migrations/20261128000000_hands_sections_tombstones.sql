-- Phase 2: hand sections (user collections), Leak Book links, cross-device deletes.

-- Custom sections for hands ("Ask Nelson", "River spots", …). A hand can be in many.
create table public.hand_collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  emoji       text check (char_length(emoji) <= 8),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index hand_collections_user_idx on public.hand_collections (user_id);
create trigger hand_collections_updated_at before update on public.hand_collections
  for each row execute function public.set_updated_at();
alter table public.hand_collections enable row level security;
create policy "own rows" on public.hand_collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Membership lives on the hand (one row to sync); stale ids are ignored by the client.
alter table public.hands add column collection_ids uuid[] not null default '{}';
create index hands_collections_idx on public.hands using gin (collection_ids);
create index hands_user_updated_idx on public.hands (user_id, updated_at);

-- Leak Book rules keep their example hands inline (rule_hands stays for server-side joins).
alter table public.rules add column hand_ids uuid[] not null default '{}';
create index rules_user_updated_idx on public.rules (user_id, updated_at);

-- Tombstones: every delete of a synced row is recorded so other devices can apply it.
-- No FK to auth.users on purpose (rows are written while an account is being deleted).
create table public.tombstones (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  table_name  text not null,
  row_id      uuid not null,
  deleted_at  timestamptz not null default now()
);
create index tombstones_user_time_idx on public.tombstones (user_id, deleted_at);
alter table public.tombstones enable row level security;
create policy "read own tombstones" on public.tombstones for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.record_tombstone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tombstones (user_id, table_name, row_id) values (old.user_id, tg_table_name, old.id);
  return old;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'bankrolls', 'transactions', 'venues', 'sessions', 'stack_updates', 'session_shortcuts',
    'habits', 'habit_logs', 'study_sessions', 'goals', 'hands', 'rules', 'hand_collections'
  ] loop
    execute format(
      'create trigger %I after delete on public.%I for each row execute function public.record_tombstone()',
      t || '_tombstone', t);
  end loop;
end $$;

-- Account deletion also clears the deleted user's tombstones.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update public.leads set user_id = null where user_id = v_user;
  delete from auth.users where id = v_user;
  delete from public.tombstones where user_id = v_user;
end $$;
