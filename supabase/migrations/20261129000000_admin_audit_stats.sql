-- Phase 3 admin panel: every admin write is audited by trigger (clients can't forge or skip
-- it), and aggregate, anonymised stats come from one SECURITY DEFINER function that only
-- admins may call.

create or replace function public.audit_admin_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (actor_id, action, target, details)
  values (
    (select auth.uid()),
    lower(tg_op) || ':' || tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'code'),
    case when tg_op = 'DELETE' then jsonb_build_object('old', to_jsonb(old)) else jsonb_build_object('new', to_jsonb(new)) end
  );
  return coalesce(new, old);
end $$;
revoke all on function public.audit_admin_change() from public, anon, authenticated;

create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.audit_admin_change();
create trigger audit_daily_hands after insert or update or delete on public.daily_hands
  for each row execute function public.audit_admin_change();
create trigger audit_access_codes after insert or update or delete on public.access_codes
  for each row execute function public.audit_admin_change();
create trigger audit_cohorts after insert or update or delete on public.cohorts
  for each row execute function public.audit_admin_change();

-- Aggregates only: no row-level user data leaves this function.
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  with activity as (
    select user_id, max(updated_at) as last_at from (
      select user_id, updated_at from public.habit_logs
      union all select user_id, updated_at from public.sessions
      union all select user_id, updated_at from public.hands
    ) a group by user_id
  )
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarding_done),
    'students', (select count(*) from public.profiles where uts_status = 'student'),
    'alumni', (select count(*) from public.profiles where uts_status = 'alumni'),
    'dau', (select count(*) from activity where last_at > now() - interval '1 day'),
    'wau', (select count(*) from activity where last_at > now() - interval '7 days'),
    'mau', (select count(*) from activity where last_at > now() - interval '30 days'),
    'signups_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'streaks', (
      select coalesce(jsonb_object_agg(bucket, n), '{}'::jsonb) from (
        select case when current = 0 then '0' when current < 7 then '1-6' when current < 30 then '7-29'
                    when current < 100 then '30-99' else '100+' end as bucket, count(*) as n
        from public.streak_state where streak_type = 'overall' group by 1
      ) s
    ),
    'leads', (
      select coalesce(jsonb_object_agg(list, n), '{}'::jsonb)
      from (select list, count(*) as n from public.leads group by list) l
    ),
    'leads_7d', (select count(*) from public.leads where created_at > now() - interval '7 days'),
    'lead_sources', (
      select coalesce(jsonb_object_agg(src, n), '{}'::jsonb) from (
        select coalesce(utm ->> 'utm_source', source) as src, count(*) as n
        from public.leads group by 1 order by 2 desc limit 10
      ) s
    ),
    'leads_unsynced', (select count(*) from public.leads where synced_to_provider_at is null)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Announcement buttons may also link inside the app ("/more/up-the-stakes#waitlist").
alter table public.announcements drop constraint if exists announcements_cta_url_check;
alter table public.announcements add constraint announcements_cta_url_check
  check (cta_url is null or cta_url ~ '^(https://|/[^/])');
