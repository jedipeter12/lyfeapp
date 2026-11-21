-- L-13: immutable local recurrence anchor and completed occurrence history.
-- No hosted project is changed by adding this file to the repository.

do $$
begin
  if exists (select 1 from public.recurrence_rules group by user_id, task_id having count(*) > 1) then
    raise exception 'L-13 migration requires review of tasks with multiple recurrence rules';
  end if;
  if exists (
    select 1 from public.recurrence_rules r join public.tasks t
      on (t.user_id, t.id) = (r.user_id, r.task_id)
    where t.due_at is null or t.completed_at is not null or
      not exists (select 1 from pg_catalog.pg_timezone_names tz
        where tz.name = r.timezone) or
      extract(second from t.due_at at time zone r.timezone) <> 0
  ) then
    raise exception 'L-13 migration requires review of undated, completed, invalid-zone, or non-minute recurring tasks';
  end if;
end;
$$;

alter table public.recurrence_rules
  add column anchor_local_date date,
  add column anchor_local_time time without time zone;

update public.recurrence_rules r
set anchor_local_date = (t.due_at at time zone r.timezone)::date,
    anchor_local_time = date_trunc('minute', t.due_at at time zone r.timezone)::time
from public.tasks t
where (t.user_id, t.id) = (r.user_id, r.task_id);

alter table public.recurrence_rules
  alter column anchor_local_date set not null,
  alter column anchor_local_time set not null,
  add constraint recurrence_anchor_minute check (extract(second from anchor_local_time) = 0),
  add constraint recurrence_one_rule_per_task unique (user_id, task_id),
  add constraint recurrence_owner_task_id unique (user_id, task_id, id);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  task_id uuid not null,
  recurrence_rule_id uuid not null,
  scheduled_local_date date not null,
  scheduled_at timestamptz not null,
  timezone text not null check (length(btrim(timezone)) > 0),
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint task_occurrences_task_owner foreign key (user_id, task_id)
    references public.tasks(user_id, id) deferrable initially deferred,
  constraint task_occurrences_rule_owner foreign key (user_id, task_id, recurrence_rule_id)
    references public.recurrence_rules(user_id, task_id, id) deferrable initially deferred,
  constraint task_occurrences_one_per_local_date unique (user_id, task_id, scheduled_local_date)
);

create index task_occurrences_history_idx
  on public.task_occurrences (user_id, task_id, scheduled_local_date desc);

alter table public.task_occurrences enable row level security;
revoke all on public.task_occurrences from public, anon, authenticated;
grant select on public.task_occurrences to authenticated;
create policy task_occurrences_select_own on public.task_occurrences
  for select to authenticated using ((select auth.uid()) = user_id);

-- The private functions are not in the exposed Data API schema. Public
-- security-invoker wrappers give the client a narrow transaction entry point.
create schema if not exists lyfe_private;
revoke all on schema lyfe_private from public, anon, authenticated;
grant usage on schema lyfe_private to authenticated;

create function lyfe_private.complete_task_occurrence(
  p_task_id uuid,
  p_scheduled_local_date date,
  p_scheduled_at timestamptz,
  p_next_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_rule public.recurrence_rules%rowtype;
  v_occurrence public.task_occurrences%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_task from public.tasks
    where id = p_task_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'Task not found'; end if;
  select * into v_rule from public.recurrence_rules
    where task_id = p_task_id and user_id = v_user_id;
  if not found then raise exception 'Recurrence rule not found'; end if;

  select * into v_occurrence from public.task_occurrences
    where user_id = v_user_id and task_id = p_task_id
      and scheduled_local_date = p_scheduled_local_date;
  if found then
    if v_occurrence.scheduled_at <> p_scheduled_at then
      raise exception 'Occurrence date already completed with another scheduled instant';
    end if;
    return pg_catalog.jsonb_build_object('task', pg_catalog.to_jsonb(v_task),
      'occurrence', pg_catalog.to_jsonb(v_occurrence));
  end if;

  if v_task.status <> 'pending' or v_task.due_at is distinct from p_scheduled_at
      or (p_scheduled_at at time zone v_rule.timezone)::date <> p_scheduled_local_date then
    raise exception 'Occurrence is no longer the next due date';
  end if;
  if v_rule.end_at is not null and p_scheduled_at > v_rule.end_at then
    raise exception 'Occurrence is beyond the rule end';
  end if;
  if p_next_at is not null and (p_next_at <= p_scheduled_at or
      (p_next_at at time zone v_rule.timezone)::date <= p_scheduled_local_date or
      (v_rule.end_at is not null and p_next_at > v_rule.end_at)) then
    raise exception 'Invalid next occurrence';
  end if;
  if p_next_at is null and v_rule.end_at is null then
    raise exception 'An open recurrence rule requires a next occurrence';
  end if;

  insert into public.task_occurrences
    (user_id, task_id, recurrence_rule_id, scheduled_local_date,
     scheduled_at, timezone, completed_at)
  values (v_user_id, p_task_id, v_rule.id, p_scheduled_local_date,
    p_scheduled_at, v_rule.timezone, pg_catalog.clock_timestamp())
  returning * into v_occurrence;

  update public.tasks set due_at = p_next_at,
    status = case when p_next_at is null then 'completed' else 'pending' end,
    completed_at = case when p_next_at is null then v_occurrence.completed_at else null end
  where id = p_task_id and user_id = v_user_id
  returning * into v_task;
  return pg_catalog.jsonb_build_object('task', pg_catalog.to_jsonb(v_task),
    'occurrence', pg_catalog.to_jsonb(v_occurrence));
end;
$$;
revoke all on function lyfe_private.complete_task_occurrence(uuid, date, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function lyfe_private.complete_task_occurrence(uuid, date, timestamptz, timestamptz)
  to authenticated;

create function public.complete_task_occurrence(
  p_task_id uuid,
  p_scheduled_local_date date,
  p_scheduled_at timestamptz,
  p_next_at timestamptz
) returns jsonb
language sql security invoker set search_path = '' as $$
  select lyfe_private.complete_task_occurrence(
    p_task_id, p_scheduled_local_date, p_scheduled_at, p_next_at);
$$;
revoke all on function public.complete_task_occurrence(uuid, date, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_task_occurrence(uuid, date, timestamptz, timestamptz)
  to authenticated;

create function lyfe_private.save_recurrence_rule(
  p_task_id uuid,
  p_frequency text,
  p_interval integer,
  p_weekdays smallint[],
  p_timezone text,
  p_end_at timestamptz,
  p_next_at timestamptz
) returns public.recurrence_rules
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_rule public.recurrence_rules%rowtype;
  v_last_date date;
  v_last_completion timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_frequency not in ('daily', 'weekly', 'monthly', 'yearly') or
      p_interval is null or p_interval < 1 or
      p_timezone is null or not exists
        (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid recurrence rule';
  end if;
  select * into v_task from public.tasks
    where id = p_task_id and user_id = v_user_id and deleted_at is null for update;
  if not found or v_task.status <> 'pending' or v_task.due_at is null then
    raise exception 'An active dated task is required';
  end if;
  select * into v_rule from public.recurrence_rules
    where user_id = v_user_id and task_id = p_task_id;
  if not found then
    if p_next_at is null or p_next_at < v_task.due_at then
      raise exception 'First recurrence must be on or after the task due date';
    end if;
    insert into public.recurrence_rules
      (user_id, task_id, frequency, interval, weekdays, timezone, end_at,
       anchor_local_date, anchor_local_time)
    values (v_user_id, p_task_id, p_frequency, p_interval, p_weekdays,
      p_timezone, p_end_at, (v_task.due_at at time zone p_timezone)::date,
      date_trunc('minute', v_task.due_at at time zone p_timezone)::time)
    returning * into v_rule;
    update public.tasks set due_at = p_next_at
      where id = p_task_id and user_id = v_user_id;
  else
    select max(scheduled_local_date), max(completed_at)
      into v_last_date, v_last_completion
      from public.task_occurrences
      where user_id = v_user_id and task_id = p_task_id;
    if p_next_at is null then
      if p_end_at is null or v_last_date is null then
        raise exception 'Cannot end a rule without completed history and an end date';
      end if;
    elsif (v_last_date is not null and
      (p_next_at at time zone p_timezone)::date <= v_last_date) then
      raise exception 'Next recurrence must follow completed history';
    end if;
    update public.recurrence_rules set frequency = p_frequency,
      interval = p_interval, weekdays = p_weekdays,
      timezone = p_timezone, end_at = p_end_at
      where id = v_rule.id and user_id = v_user_id
      returning * into v_rule;
    update public.tasks set due_at = p_next_at,
      status = case when p_next_at is null then 'completed' else 'pending' end,
      completed_at = case when p_next_at is null then v_last_completion else null end
      where id = p_task_id and user_id = v_user_id;
  end if;
  if p_next_at is not null and p_end_at is not null and p_next_at > p_end_at then
    raise exception 'Next recurrence is beyond the end date';
  end if;
  return v_rule;
end;
$$;
revoke all on function lyfe_private.save_recurrence_rule(uuid, text, integer, smallint[], text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function lyfe_private.save_recurrence_rule(uuid, text, integer, smallint[], text, timestamptz, timestamptz)
  to authenticated;

create function public.save_recurrence_rule(
  p_task_id uuid,
  p_frequency text,
  p_interval integer,
  p_weekdays smallint[],
  p_timezone text,
  p_end_at timestamptz,
  p_next_at timestamptz
) returns public.recurrence_rules
language sql security invoker set search_path = '' as $$
  select lyfe_private.save_recurrence_rule(p_task_id, p_frequency, p_interval,
    p_weekdays, p_timezone, p_end_at, p_next_at);
$$;
revoke all on function public.save_recurrence_rule(uuid, text, integer, smallint[], text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.save_recurrence_rule(uuid, text, integer, smallint[], text, timestamptz, timestamptz)
  to authenticated;

-- Rule writes go through the atomic owner-checked operation after L-13.
revoke insert, update on public.recurrence_rules from authenticated;
revoke update (frequency, interval, weekdays, timezone, end_at)
  on public.recurrence_rules from authenticated;

create function public.guard_recurring_task_state()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user = 'authenticated' and
      (new.due_at is distinct from old.due_at or
       new.status is distinct from old.status or
       new.completed_at is distinct from old.completed_at) and
      exists (select 1 from public.recurrence_rules r
        where r.user_id = old.user_id and r.task_id = old.id) then
    raise exception 'Recurring task state must use the occurrence operation';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_recurring_task_state() from public, anon, authenticated;
create trigger tasks_guard_recurring_state
before update of due_at, status, completed_at on public.tasks
for each row execute function public.guard_recurring_task_state();
