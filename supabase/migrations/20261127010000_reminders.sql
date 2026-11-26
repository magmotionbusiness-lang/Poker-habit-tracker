-- Phase 1: daily reminder bookkeeping (written by the server's reminder job only).
alter table public.profiles add column last_reminded_on date;

-- The reminder job filters subscriptions by category.
create index push_subscriptions_categories_idx on public.push_subscriptions using gin (categories);
