-- RLS / integrity checks. Every block raises on failure. Run via scripts/verify-schema.sh.
\set ON_ERROR_STOP on
grant usage on schema extensions to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test');
insert into public.access_codes (code, pro_months, max_uses) values ('COHORT7', 6, 1);

-- Profiles were created by the trigger.
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profile trigger';
end $$;

-- As user B: create a bankroll.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.bankrolls (id, user_id, name, currency)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Live', 'USD');

-- As user A.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.bankrolls) = 0, 'A must not see B''s bankroll';
  assert (select count(*) from public.profiles) = 1, 'A sees only own profile';
end $$;

-- A cannot write rows owned by B.
do $$ begin
  begin
    insert into public.bankrolls (user_id, name, currency) values ('00000000-0000-0000-0000-00000000000b', 'x', 'USD');
    raise exception 'FAIL: inserted row for another user';
  exception when insufficient_privilege then null; end;
end $$;

-- A cannot attach a transaction to B's bankroll (composite FK).
do $$ begin
  begin
    insert into public.transactions (user_id, bankroll_id, type, amount_minor, currency)
      values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1', 'deposit', 100, 'USD');
    raise exception 'FAIL: cross-user parent reference';
  exception when foreign_key_violation then null; end;
end $$;

-- A cannot make themselves Pro or admin.
do $$ begin
  begin
    update public.profiles set plan = 'pro' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: user changed own plan';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL: user made self admin';
  exception when insufficient_privilege then null; end;
end $$;
update public.profiles set display_name = 'Máté', default_currency = 'HUF' where id = '00000000-0000-0000-0000-00000000000a';

-- Phase 1: users can store their own settings, but still not privileged columns.
update public.profiles set settings = '{"restWeekdays":[7]}' where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select settings->'restWeekdays' from public.profiles where id = auth.uid()) = '[7]'::jsonb, 'settings saved';
end $$;

-- Sync upserts with client-generated ids are idempotent.
insert into public.habits (id, user_id, kind, key, name) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000a', 'preset', 'study', 'Study')
  on conflict (id) do update set name = excluded.name;
insert into public.habits (id, user_id, kind, key, name) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000a', 'preset', 'study', 'Study 30')
  on conflict (id) do update set name = excluded.name;
insert into public.habit_logs (habit_id, user_id, date, value) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000a', '2026-11-26', 10)
  on conflict (habit_id, date) do update set value = excluded.value;
insert into public.habit_logs (habit_id, user_id, date, value) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000a', '2026-11-26', 35)
  on conflict (habit_id, date) do update set value = excluded.value;
do $$ begin
  assert (select count(*) from public.habits) = 1, 'habit upsert idempotent';
  assert (select value from public.habit_logs) = 35, 'habit log upsert on (habit_id, date)';
end $$;

-- Phase 2: hand sections and tombstones.
insert into public.hand_collections (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Ask Nelson');
insert into public.hands (id, user_id, source, collection_ids) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', 'manual', '{00000000-0000-0000-0000-0000000000c1}');
delete from public.hands where id = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert (select count(*) from public.tombstones where row_id = '00000000-0000-0000-0000-0000000000d1' and table_name = 'hands') = 1, 'delete leaves a tombstone';
  begin
    insert into public.tombstones (user_id, table_name, row_id) values (auth.uid(), 'hands', gen_random_uuid());
    raise exception 'FAIL: users can forge tombstones';
  exception when insufficient_privilege then null; end;
end $$;

-- Money must be integers; currency must be ISO-shaped.
do $$ begin
  begin
    insert into public.bankrolls (user_id, name, currency) values ('00000000-0000-0000-0000-00000000000a', 'x', 'usd');
    raise exception 'FAIL: lowercase currency accepted';
  exception when check_violation then null; end;
end $$;

-- A full session + hand flow works for the owner.
insert into public.bankrolls (id, user_id, name, currency)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Live', 'EUR');
insert into public.sessions (id, user_id, bankroll_id, format, is_live, currency, started_at, ended_at, status, buy_in_minor, cash_out_minor)
  values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
          'cash', true, 'EUR', now() - interval '4 hours', now(), 'finished', 30000, 51200);
insert into public.hands (user_id, session_id, source, hero_cards, share_slug, is_public)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'manual', 'AsKd', 'abcdefghijkl', true);

-- Only one running session per user.
insert into public.sessions (user_id, format, is_live, currency, started_at)
  values ('00000000-0000-0000-0000-00000000000a', 'cash', true, 'EUR', now());
do $$ begin
  begin
    insert into public.sessions (user_id, format, is_live, currency, started_at)
      values ('00000000-0000-0000-0000-00000000000a', 'cash', true, 'EUR', now());
    raise exception 'FAIL: two running sessions';
  exception when unique_violation then null; end;
end $$;

-- Access code: works once, Pro granted via SECURITY DEFINER.
select * from public.redeem_access_code('cohort7');
do $$ begin
  assert (select plan from public.profiles where id = auth.uid()) = 'pro', 'code grants pro';
  assert (select uts_status from public.profiles where id = auth.uid()) = 'student', 'code grants student';
  begin
    perform public.redeem_access_code('COHORT7');
    raise exception 'FAIL: code redeemed twice';
  exception when raise_exception then
    if sqlerrm not in ('already_redeemed', 'code_used_up') then raise; end if;
  end;
end $$;

-- Intelligence layer: opponents are private, sync deletes, mood is range-checked.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.opponents (id, user_id, nickname, style, traits)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000b', 'Mike', 'loose_aggressive', '{"river_bluffs":{"level":"high","evidence":6}}');
do $$ begin
  begin
    insert into public.opponents (user_id, nickname, style) values ('00000000-0000-0000-0000-00000000000b', 'x', 'shark');
    raise exception 'FAIL: unknown style accepted';
  exception when check_violation then null; end;
end $$;
delete from public.opponents where id = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert exists (select 1 from public.tombstones where table_name = 'opponents' and row_id = '00000000-0000-0000-0000-0000000000f1'), 'opponent delete tombstoned';
end $$;
insert into public.opponents (user_id, nickname) values ('00000000-0000-0000-0000-00000000000b', 'Anna');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.opponents) = 0, 'A cannot see B''s opponents';
end $$;
reset role;
do $$ begin
  begin
    update public.sessions set mood = 9;
    raise exception 'FAIL: mood out of range accepted';
  exception when check_violation then null; end;
end $$;

-- Phase 3 admin: non-admins can't read stats, write announcements or forge audit rows;
-- an admin's writes are audited by trigger.
reset role;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  begin
    perform public.admin_stats();
    raise exception 'FAIL: non-admin read admin stats';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.announcements (type, title, starts_at) values ('promo', 'x', now());
    raise exception 'FAIL: non-admin wrote an announcement';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.audit_log (action) values ('forged');
    raise exception 'FAIL: user forged an audit row';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.audit_log) = 0, 'users cannot read the audit log';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.announcements (type, title, starts_at, published)
  values ('workshop', 'Blueprint', now() + interval '2 days', true);
insert into public.daily_hands (date, spot, options, answer, explanation)
  values (current_date + 3, '{}', '["a","b"]', 1, 'x');
update public.daily_hands set approved = true where date = current_date + 3;
do $$ begin
  assert (public.admin_stats() ->> 'users')::int = 2, 'admin stats users';
  assert (select count(*) from public.audit_log
          where actor_id = '00000000-0000-0000-0000-00000000000b') = 3, 'admin writes audited';
  assert exists (select 1 from public.audit_log where action = 'update:daily_hands'), 'update audited';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert (select count(*) from public.announcements) = 1, 'user sees the published announcement';
end $$;

-- Anonymous visitors: public hand by slug only, no listing.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  assert (select count(*) from public.get_public_hand('abcdefghijkl')) = 1, 'public share by slug';
  assert (select count(*) from public.get_public_hand('nope-nope-nope')) = 0, 'unknown slug';
  -- Supabase grants anon table access; RLS (no anon policy) must yield zero rows.
  assert (select count(*) from public.hands) = 0, 'anon must not list hands';
  assert (select count(*) from public.profiles) = 0, 'anon must not list profiles';
  assert (select count(*) from public.leads) = 0, 'anon must not list leads';
end $$;

-- Account deletion cascades everything.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000a'), 'user deleted';
  assert not exists (select 1 from public.sessions where user_id = '00000000-0000-0000-0000-00000000000a'), 'sessions cascaded';
  assert not exists (select 1 from public.hands where user_id = '00000000-0000-0000-0000-00000000000a'), 'hands cascaded';
  assert exists (select 1 from public.bankrolls where user_id = '00000000-0000-0000-0000-00000000000b'), 'B untouched';
end $$;

-- Tombstones of a deleted account are cleaned up.
do $$ begin
  assert not exists (select 1 from public.tombstones where user_id = '00000000-0000-0000-0000-00000000000a'), 'tombstones cleared on account deletion';
end $$;

\echo 'ALL SCHEMA CHECKS PASSED'
