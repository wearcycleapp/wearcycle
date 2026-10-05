-- Daily limits on Claude requests per person, so opening Wearcycle to others cannot run up the Anthropic bill.
-- Run once in Supabase: SQL Editor > New query > paste all > Run. Safe to run again.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  task    text not null,
  n       int  not null default 0,
  primary key (user_id, day, task)
);
alter table public.ai_usage enable row level security;
-- No policies on purpose: nobody can read or edit this table directly; only the function below touches it.
revoke all on public.ai_usage from anon, authenticated;

-- Adds one request for the signed-in user and returns the new count for today (UTC).
create or replace function public.bump_ai_usage(p_task text)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.ai_usage(user_id, day, task, n) values (auth.uid(), current_date, p_task, 1)
  on conflict (user_id, day, task) do update set n = public.ai_usage.n + 1
  returning n into v;
  return v;
end $$;
revoke all on function public.bump_ai_usage(text) from public, anon;
grant execute on function public.bump_ai_usage(text) to authenticated;
