-- Phase 1: columns needed by the local-first sync layer.

-- User preferences (commitment, rest days, formats, reminder times, …). Users may edit it.
alter table public.profiles add column settings jsonb not null default '{}'::jsonb;
grant update (settings) on public.profiles to authenticated;

-- A running session can be paused; the pause start must survive app restarts and devices.
alter table public.sessions add column paused_at timestamptz;

-- Progress the user enters by hand for stake/custom goals.
alter table public.goals add column manual_value bigint;
alter table public.goals alter column unit set default 'minor';

-- Session shortcuts get an updated_at like everything else (for last-write-wins sync).
alter table public.session_shortcuts add column updated_at timestamptz not null default now();
create trigger session_shortcuts_updated_at before update on public.session_shortcuts
  for each row execute function public.set_updated_at();

-- Sync pulls use these cursors.
create index sessions_user_updated_idx on public.sessions (user_id, updated_at);
create index habit_logs_user_updated_idx on public.habit_logs (user_id, updated_at);
create index transactions_user_updated_idx on public.transactions (user_id, updated_at);
