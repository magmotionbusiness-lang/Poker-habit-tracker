-- =============================================================================
-- Stakers — initial schema (Phase 0)
-- Mirrors BUILD-PROMPT §6. Conventions:
--   * money = bigint minor units + char(3) ISO-4217 currency, never floats
--   * timestamps = timestamptz (UTC); habit "days" = date in the user's timezone
--   * every user-owned row carries user_id; child rows use composite FKs
--     (parent_id, user_id) so a row can never point at another user's parent
--   * RLS on every table; privileged writes go through SECURITY DEFINER functions
-- =============================================================================

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create domain public.currency_code as char(3) check (value ~ '^[A-Z]{3}$');
create domain public.rating_1_5 as smallint check (value between 1 and 5);

-- ---------------------------------------------------------------------------
-- Cohorts (Up The Stakes) — referenced by profiles
-- ---------------------------------------------------------------------------
create table public.cohorts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                         -- "Cohort 7"
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) <= 80),
  handle            extensions.citext unique check (handle ~ '^[A-Za-z0-9_.]{2,30}$'),
  avatar_url        text,
  country           char(2),
  default_currency  public.currency_code not null default 'USD',
  display_mode      text not null default 'money' check (display_mode in ('money', 'bb')),
  timezone          text not null default 'UTC',
  plan              text not null default 'free' check (plan in ('free', 'pro')),
  pro_until         timestamptz,                     -- null = no expiry (paid) / not pro
  role              text not null default 'user' check (role in ('user', 'admin')),
  uts_status        text not null default 'none' check (uts_status in ('none', 'student', 'alumni')),
  cohort_id         uuid references public.cohorts (id) on delete set null,
  onboarding_done   boolean not null default false,
  signup_utm        jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, signup_utm)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data -> 'utm'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Bankrolls & transactions
-- ---------------------------------------------------------------------------
create table public.bankrolls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  currency    public.currency_code not null,
  archived    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index bankrolls_user_idx on public.bankrolls (user_id);
create trigger bankrolls_updated_at before update on public.bankrolls
  for each row execute function public.set_updated_at();

create table public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  bankroll_id           uuid not null,
  type                  text not null check (type in ('deposit', 'withdrawal', 'transfer', 'adjustment')),
  amount_minor          bigint not null,
  currency              public.currency_code not null,
  fx_rate_to_display    numeric(20, 10) check (fx_rate_to_display > 0),
  transfer_bankroll_id  uuid,                         -- counterpart for transfers
  note                  text,
  occurred_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (bankroll_id, user_id) references public.bankrolls (id, user_id) on delete cascade,
  foreign key (transfer_bankroll_id, user_id) references public.bankrolls (id, user_id) on delete set null (transfer_bankroll_id)
);
create index transactions_user_time_idx on public.transactions (user_id, occurred_at desc);
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- Daily FX cache (shared, read-only for users; written by a server job).
create table public.fx_rates (
  day      date not null,
  base     public.currency_code not null,
  quote    public.currency_code not null,
  rate     numeric(20, 10) not null check (rate > 0),
  source   text not null default 'ecb',
  primary key (day, base, quote)
);

-- ---------------------------------------------------------------------------
-- Venues, shortcuts, sessions
-- ---------------------------------------------------------------------------
create table public.venues (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  type        text not null check (type in ('live', 'online')),
  location    text,
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index venues_user_idx on public.venues (user_id);
create trigger venues_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

create table public.session_shortcuts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 40),  -- "Crown $2/3"
  preset      jsonb not null default '{}'::jsonb,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index session_shortcuts_user_idx on public.session_shortcuts (user_id);

create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  bankroll_id      uuid,
  venue_id         uuid,
  format           text not null check (format in ('cash', 'mtt', 'sng', 'spin')),
  is_live          boolean not null,
  game             text not null default 'NLHE',
  stakes_sb_minor  bigint,
  stakes_bb_minor  bigint,
  straddle_minor   bigint,
  buy_in_minor     bigint not null default 0 check (buy_in_minor >= 0),
  rebuys_minor     bigint not null default 0 check (rebuys_minor >= 0),
  cash_out_minor   bigint not null default 0 check (cash_out_minor >= 0),
  prize_minor      bigint not null default 0 check (prize_minor >= 0),
  bounties_minor   bigint not null default 0 check (bounties_minor >= 0),
  fees_minor       bigint not null default 0 check (fees_minor >= 0),
  tips_minor       bigint not null default 0 check (tips_minor >= 0),
  expenses         jsonb not null default '[]'::jsonb,   -- [{kind, amount_minor, note}]
  currency         public.currency_code not null,
  fx_rate          numeric(20, 10) check (fx_rate > 0),  -- to display currency at session time
  started_at       timestamptz not null,
  ended_at         timestamptz,
  paused_ms        bigint not null default 0 check (paused_ms >= 0),
  hands_played     int check (hands_played >= 0),
  finish_position  int check (finish_position > 0),
  field_size       int check (field_size > 0),
  focus_rating     public.rating_1_5,
  tilt_rating      public.rating_1_5,
  energy_rating    public.rating_1_5,
  sleep_rating     public.rating_1_5,
  game_rating      char(1) check (game_rating in ('A', 'B', 'C')),
  focus_point      text,
  followed_focus   boolean,
  stop_loss_minor  bigint,
  max_length_min   int,
  takeaway         text,
  notes            text,
  tags             text[] not null default '{}',
  status           text not null default 'running' check (status in ('running', 'finished')),
  client_id        uuid unique,                        -- idempotency key for offline sync
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  foreign key (bankroll_id, user_id) references public.bankrolls (id, user_id) on delete set null (bankroll_id),
  foreign key (venue_id, user_id) references public.venues (id, user_id) on delete set null (venue_id),
  check (ended_at is null or ended_at >= started_at),
  check (status = 'running' or ended_at is not null),
  check (finish_position is null or field_size is null or finish_position <= field_size)
);
create index sessions_user_time_idx on public.sessions (user_id, started_at desc);
create unique index sessions_one_running_per_user on public.sessions (user_id) where status = 'running';
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

create table public.stack_updates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  session_id   uuid not null,
  stack_minor  bigint not null check (stack_minor >= 0),
  addon_minor  bigint not null default 0 check (addon_minor >= 0),
  at           timestamptz not null default now(),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade
);
create index stack_updates_session_idx on public.stack_updates (session_id, at);

-- ---------------------------------------------------------------------------
-- Hands, Leak Book, opponents
-- ---------------------------------------------------------------------------
create table public.hands (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  session_id        uuid,
  source            text not null check (source in ('import', 'manual', 'quick_note')),
  site              text,
  external_hand_id  text,
  played_at         timestamptz,
  game              text not null default 'NLHE',
  stakes            text,
  hero_position     text,
  hero_cards        text check (hero_cards ~ '^([2-9TJQKA][shdc]){2,6}$'),
  ohh               jsonb,                -- Open Hand History–shaped normalised hand
  quick_note        text,
  net_minor         bigint,
  currency          public.currency_code,
  net_bb            numeric(12, 2),
  pot_bb            numeric(12, 2),
  auto_tags         text[] not null default '{}',
  user_tags         text[] not null default '{}',
  starred           boolean not null default false,
  review_status     text not null default 'unreviewed' check (review_status in ('unreviewed', 'reviewed', 'lesson')),
  review            jsonb,
  share_slug        text unique check (share_slug ~ '^[A-Za-z0-9_-]{10,32}$'),
  is_public         boolean not null default false,
  client_id         uuid unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete set null (session_id),
  check (not is_public or share_slug is not null)
);
create unique index hands_external_unique on public.hands (user_id, site, external_hand_id)
  where external_hand_id is not null;
create index hands_user_time_idx on public.hands (user_id, played_at desc);
create index hands_review_idx on public.hands (user_id, review_status);
create index hands_auto_tags_idx on public.hands using gin (auto_tags);
create index hands_user_tags_idx on public.hands using gin (user_tags);
create trigger hands_updated_at before update on public.hands
  for each row execute function public.set_updated_at();

create table public.rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  category          text not null check (category in ('preflop', 'flop', 'turn', 'river', 'exploitative', 'multiway', 'mental', 'bankroll', 'other')),
  text              text not null check (char_length(text) between 1 and 500),
  status            text not null default 'working' check (status in ('working', 'fixed')),
  times_seen        int not null default 1 check (times_seen >= 0),
  last_surfaced_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id)
);
create index rules_user_idx on public.rules (user_id, status);
create trigger rules_updated_at before update on public.rules
  for each row execute function public.set_updated_at();

create table public.rule_hands (
  user_id  uuid not null references auth.users (id) on delete cascade,
  rule_id  uuid not null,
  hand_id  uuid not null,
  primary key (rule_id, hand_id),
  foreign key (rule_id, user_id) references public.rules (id, user_id) on delete cascade,
  foreign key (hand_id, user_id) references public.hands (id, user_id) on delete cascade
);

create table public.opponents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  nickname     text not null check (char_length(nickname) between 1 and 60),
  venue_id     uuid,
  description  text,
  tags         text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  foreign key (venue_id, user_id) references public.venues (id, user_id) on delete set null (venue_id)
);
create index opponents_user_idx on public.opponents (user_id);
create trigger opponents_updated_at before update on public.opponents
  for each row execute function public.set_updated_at();

create table public.hand_opponents (
  user_id      uuid not null references auth.users (id) on delete cascade,
  hand_id      uuid not null,
  opponent_id  uuid not null,
  seat         text,
  primary key (hand_id, opponent_id),
  foreign key (hand_id, user_id) references public.hands (id, user_id) on delete cascade,
  foreign key (opponent_id, user_id) references public.opponents (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Habits, study, streaks, goals
-- ---------------------------------------------------------------------------
create table public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('preset', 'custom')),
  key           text,                                  -- preset key, e.g. 'review_hands'
  name          text not null check (char_length(name) between 1 and 60),
  target_value  int not null default 1 check (target_value > 0),
  unit          text not null default 'count' check (unit in ('count', 'minutes', 'boolean')),
  days_of_week  smallint[] not null default '{1,2,3,4,5,6,7}',   -- ISO: 1 = Monday
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  check (days_of_week <@ '{1,2,3,4,5,6,7}'::smallint[])
);
create unique index habits_user_preset_unique on public.habits (user_id, key) where kind = 'preset';
create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

create table public.habit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  habit_id  uuid not null,
  date      date not null,                             -- user-local calendar day
  value     int not null default 0 check (value >= 0),
  source    text not null default 'manual' check (source in ('manual', 'auto')),
  updated_at timestamptz not null default now(),
  unique (habit_id, date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, date desc);
create trigger habit_logs_updated_at before update on public.habit_logs
  for each row execute function public.set_updated_at();

create table public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  started_at  timestamptz not null,
  minutes     int not null check (minutes > 0 and minutes <= 1440),
  category    text not null check (category in ('solver', 'course', 'ranges', 'hand_review', 'group', 'coaching', 'other')),
  note        text,
  client_id   uuid unique,
  created_at  timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

create table public.streak_state (
  user_id            uuid not null references auth.users (id) on delete cascade,
  streak_type        text not null check (streak_type in ('overall', 'study', 'review', 'daily_hand')),
  current            int not null default 0 check (current >= 0),
  longest            int not null default 0 check (longest >= 0),
  total_active_days  int not null default 0 check (total_active_days >= 0),
  freezes_available  int not null default 0 check (freezes_available between 0 and 5),
  last_counted_date  date,
  rest_days          smallint[] not null default '{}',
  repair_deadline    date,
  updated_at         timestamptz not null default now(),
  primary key (user_id, streak_type),
  check (longest >= current)
);
create trigger streak_state_updated_at before update on public.streak_state
  for each row execute function public.set_updated_at();

create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  type          text not null check (type in ('profit', 'bankroll', 'stake', 'volume', 'study', 'reviews', 'custom')),
  title         text not null,
  target_value  bigint not null,
  start_value   bigint not null default 0,
  currency      public.currency_code,
  unit          text,                                  -- 'minor', 'hours', 'sessions', 'hands', 'minutes'
  starts_at     timestamptz not null default now(),
  deadline      date,
  is_main       boolean not null default false,
  status        text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  achieved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index goals_one_main_per_user on public.goals (user_id) where is_main and status = 'active';
create trigger goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Daily Hand
-- ---------------------------------------------------------------------------
create table public.daily_hands (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  spot         jsonb not null,
  options      jsonb not null,
  answer       int not null,
  explanation  text not null,
  author       text,
  approved     boolean not null default false,       -- Nelson approves before it goes live
  created_at   timestamptz not null default now()
);

create table public.daily_hand_answers (
  user_id        uuid not null references auth.users (id) on delete cascade,
  daily_hand_id  uuid not null references public.daily_hands (id) on delete cascade,
  choice         int not null,
  correct        boolean not null,
  answered_at    timestamptz not null default now(),
  primary key (user_id, daily_hand_id)
);

-- ---------------------------------------------------------------------------
-- Up The Stakes layer: announcements, access codes, leads
-- ---------------------------------------------------------------------------
create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('cohort_opening', 'cohort_closing', 'workshop', 'live_qa', 'new_content', 'promo')),
  title         text not null,
  body          text,
  image_url     text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  cta_label     text,
  cta_url       text check (cta_url is null or cta_url ~ '^https://'),
  audience      text not null default 'everyone' check (audience in ('everyone', 'non_students', 'students', 'alumni', 'cohort')),
  cohort_id     uuid references public.cohorts (id) on delete cascade,
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  push_offsets  interval[] not null default '{}',
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (audience <> 'cohort' or cohort_id is not null)
);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_views (
  user_id          uuid not null references auth.users (id) on delete cascade,
  announcement_id  uuid not null references public.announcements (id) on delete cascade,
  seen_at          timestamptz not null default now(),
  dismissed        boolean not null default false,
  clicked          boolean not null default false,
  modal_shown      boolean not null default false,
  primary key (user_id, announcement_id)
);

create table public.access_codes (
  code         extensions.citext primary key check (char_length(code) between 4 and 40),
  cohort_id    uuid references public.cohorts (id) on delete set null,
  grants_plan  text not null default 'pro' check (grants_plan in ('pro')),
  grants_status text not null default 'student' check (grants_status in ('student', 'alumni')),
  pro_months   int not null default 6 check (pro_months > 0),
  expires_at   timestamptz,
  max_uses     int check (max_uses > 0),
  uses         int not null default 0 check (uses >= 0),
  created_at   timestamptz not null default now(),
  check (max_uses is null or uses <= max_uses)
);

create table public.access_code_redemptions (
  user_id      uuid not null references auth.users (id) on delete cascade,
  code         extensions.citext not null references public.access_codes (code) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  primary key (user_id, code)
);

-- Leads are written only by the server (service role) after validation + rate limiting.
create table public.leads (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users (id) on delete set null,
  name                    text check (char_length(name) <= 120),
  email                   extensions.citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  instagram               text check (char_length(instagram) <= 80),
  list                    text not null check (list in ('waitlist', 'newsletter')),
  consent_text            text not null,
  consented_at            timestamptz not null,
  utm                     jsonb,
  source                  text not null default 'app',
  synced_to_provider_at   timestamptz,
  provider_error          text,
  created_at              timestamptz not null default now(),
  unique (email, list)
);

-- ---------------------------------------------------------------------------
-- Notifications, flags, audit
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  categories  text[] not null default '{reminders,uts_news}',
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notification_prefs (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  reminders           boolean not null default true,
  reminder_times      time[] not null default '{19:00}',
  uts_news            boolean not null default true,
  weekly_review       boolean not null default true,
  quiet_hours_start   time default '22:30',
  quiet_hours_end     time default '08:00',
  updated_at          timestamptz not null default now()
);
create trigger notification_prefs_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

create table public.feature_flags (
  key          text primary key,
  enabled      boolean not null default false,
  plans        text[] not null default '{free,pro}',
  description  text,
  updated_at   timestamptz not null default now()
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target      text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Owner-only tables: read/write your own rows, nothing else.
do $$
declare t text;
begin
  foreach t in array array[
    'bankrolls', 'transactions', 'venues', 'session_shortcuts', 'sessions', 'stack_updates',
    'hands', 'rules', 'rule_hands', 'opponents', 'hand_opponents', 'habits', 'habit_logs',
    'study_sessions', 'streak_state', 'goals', 'daily_hand_answers', 'announcement_views',
    'push_subscriptions', 'notification_prefs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Profiles: read/update own; privileged columns are not updatable by users (column grants below).
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (display_name, handle, avatar_url, country, default_currency, display_mode, timezone, onboarding_done)
  on public.profiles to authenticated;

-- Reference data readable by signed-in users; admin-managed.
alter table public.cohorts enable row level security;
create policy "read cohorts" on public.cohorts for select to authenticated using (true);
create policy "admin cohorts" on public.cohorts for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.fx_rates enable row level security;
create policy "read fx" on public.fx_rates for select to authenticated using (true);

alter table public.feature_flags enable row level security;
create policy "read flags" on public.feature_flags for select to anon, authenticated using (true);
create policy "admin flags" on public.feature_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.daily_hands enable row level security;
create policy "read approved daily hands" on public.daily_hands for select to authenticated
  using ((approved and date <= current_date + 1) or public.is_admin());
create policy "admin daily hands" on public.daily_hands for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.announcements enable row level security;
create policy "read published announcements" on public.announcements for select to anon, authenticated
  using ((published and (ends_at is null or ends_at > now())) or public.is_admin());
create policy "admin announcements" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- No user-facing access at all (server/service role or SECURITY DEFINER functions only).
alter table public.access_codes enable row level security;
create policy "admin access codes" on public.access_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.access_code_redemptions enable row level security;
create policy "read own redemptions" on public.access_code_redemptions for select to authenticated using (user_id = (select auth.uid()));
alter table public.leads enable row level security;
create policy "admin reads leads" on public.leads for select to authenticated using (public.is_admin());
alter table public.audit_log enable row level security;
create policy "admin reads audit" on public.audit_log for select to authenticated using (public.is_admin());

-- =============================================================================
-- Functions exposed to clients
-- =============================================================================

-- Public hand share: readable by anyone who has the slug — never listable.
create or replace function public.get_public_hand(slug text)
returns table (game text, stakes text, played_at timestamptz, hero_position text, hero_cards text,
               ohh jsonb, net_bb numeric, pot_bb numeric)
language sql stable security definer set search_path = '' as $$
  select h.game, h.stakes, h.played_at, h.hero_position, h.hero_cards, h.ohh, h.net_bb, h.pot_bb
  from public.hands h
  where h.share_slug = slug and h.is_public;
$$;
revoke all on function public.get_public_hand(text) from public;
grant execute on function public.get_public_hand(text) to anon, authenticated;

-- Redeem a cohort access code: grants Pro for N months + student/alumni status.
create or replace function public.redeem_access_code(p_code text)
returns table (plan text, pro_until timestamptz, uts_status text, cohort_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_code public.access_codes;
  v_until timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  -- Explicit lower(): with search_path = '' the citext "=" operator isn't visible and
  -- Postgres silently falls back to case-sensitive text equality.
  select * into v_code from public.access_codes c
   where lower(c.code::text) = lower(btrim(p_code)) for update;
  if not found then raise exception 'invalid_code' using errcode = 'P0001'; end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'code_expired' using errcode = 'P0001';
  end if;
  if v_code.max_uses is not null and v_code.uses >= v_code.max_uses then
    raise exception 'code_used_up' using errcode = 'P0001';
  end if;

  insert into public.access_code_redemptions (user_id, code) values (v_user, v_code.code)
    on conflict do nothing;
  if not found then raise exception 'already_redeemed' using errcode = 'P0001'; end if;

  update public.access_codes set uses = uses + 1 where code = v_code.code;

  select greatest(coalesce(p.pro_until, now()), now()) + make_interval(months => v_code.pro_months)
    into v_until from public.profiles p where p.id = v_user;

  update public.profiles p
     set plan = 'pro',
         pro_until = v_until,
         uts_status = case when p.uts_status = 'alumni' then 'alumni' else v_code.grants_status end,
         cohort_id = coalesce(v_code.cohort_id, p.cohort_id)
   where p.id = v_user;

  return query select p.plan, p.pro_until, p.uts_status, p.cohort_id from public.profiles p where p.id = v_user;
end $$;
revoke all on function public.redeem_access_code(text) from public;
grant execute on function public.redeem_access_code(text) to authenticated;

-- Real account deletion (GDPR): removes the auth user; every table cascades.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.leads set user_id = null where user_id = (select auth.uid());
  delete from auth.users where id = (select auth.uid());
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
