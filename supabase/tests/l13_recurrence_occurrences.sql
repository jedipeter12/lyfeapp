-- Disposable PostgreSQL only, after the Auth/Storage stubs and all migrations
-- through L-13. Synthetic rows are rolled back.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.tasks (id, user_id, title, status, priority, due_at)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111', 'Synthetic recurring task',
  'pending', 'medium', '2027-05-01T14:00:00Z');

insert into public.tasks (id, user_id, title, status, priority, due_at)
values ('ffffffff-ffff-4fff-8fff-ffffffffffff',
  '11111111-1111-4111-8111-111111111111', 'Synthetic weekday task',
  'pending', 'low', '2027-01-04T15:00:00Z');
select public.save_recurrence_rule(
  'ffffffff-ffff-4fff-8fff-ffffffffffff', 'weekly', 2,
  array[3]::smallint[], 'America/Chicago', null, '2027-01-06T15:00:00Z');
do $$
begin
  if not exists (select 1 from public.tasks
      where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
      and due_at = '2027-01-06T15:00:00Z') then
    raise exception 'first selected weekday did not become due';
  end if;
end;
$$;

select public.save_recurrence_rule(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'monthly', 1, null,
  'America/Chicago', '2027-07-01T14:00:00Z', '2027-05-01T14:00:00Z');

do $$
begin
  if not exists (select 1 from public.recurrence_rules
      where task_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and anchor_local_date = '2027-05-01' and anchor_local_time = '09:00') then
    raise exception 'local anchor was not preserved';
  end if;
  if has_table_privilege('authenticated', 'public.task_occurrences', 'INSERT') then
    raise exception 'direct occurrence insert must not be granted';
  end if;
  if has_table_privilege('authenticated', 'public.recurrence_rules', 'UPDATE') then
    raise exception 'direct rule update must not be granted';
  end if;
  begin
    update public.recurrence_rules set frequency = 'daily'
      where task_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    raise exception 'direct rule frequency update was allowed';
  exception when others then
    if sqlerrm = 'direct rule frequency update was allowed' then raise; end if;
  end;
  begin
    update public.tasks set due_at = '2027-06-01T14:00:00Z'
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    raise exception 'direct recurring due update was allowed';
  exception when others then
    if sqlerrm = 'direct recurring due update was allowed' then raise; end if;
  end;
end;
$$;

do $$
begin
  begin
    perform public.complete_task_occurrence(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-05-01',
      '2027-05-01T14:00:00Z', '2027-05-01T15:00:00Z');
    raise exception 'same-day next occurrence was allowed';
  exception when others then
    if sqlerrm = 'same-day next occurrence was allowed' then raise; end if;
  end;
end;
$$;

select public.complete_task_occurrence(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-05-01',
  '2027-05-01T14:00:00Z', '2027-06-01T14:00:00Z');
select public.complete_task_occurrence(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-05-01',
  '2027-05-01T14:00:00Z', '2027-06-01T14:00:00Z');

do $$
begin
  if (select count(*) from public.task_occurrences
      where task_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then
    raise exception 'retry created a duplicate occurrence';
  end if;
  if (select due_at from public.tasks
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> '2027-06-01T14:00:00Z' then
    raise exception 'retry advanced the due date twice';
  end if;
end;
$$;

-- An edit changes future scheduling without rewriting completed history.
select public.save_recurrence_rule(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'monthly', 1, null,
  'UTC', '2027-07-01T09:00:00Z', '2027-06-01T09:00:00Z');
do $$
begin
  if (select due_at from public.tasks
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> '2027-06-01T09:00:00Z' then
    raise exception 'rule edit did not move future due instant';
  end if;
  if (select timezone from public.task_occurrences
      where task_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 'America/Chicago' then
    raise exception 'rule edit rewrote occurrence history';
  end if;
  begin
    perform public.save_recurrence_rule(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'monthly', 1, null,
      'UTC', null, '2027-05-01T09:00:00Z');
    raise exception 'rule edit moved next due into completed history';
  exception when others then
    if sqlerrm = 'rule edit moved next due into completed history' then raise; end if;
  end;
end;
$$;

select public.complete_task_occurrence(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-06-01',
  '2027-06-01T09:00:00Z', '2027-07-01T09:00:00Z');
select public.complete_task_occurrence(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-07-01',
  '2027-07-01T09:00:00Z', null);

do $$
begin
  if (select count(*) from public.task_occurrences
      where task_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 3 then
    raise exception 'completed history missing';
  end if;
  if not exists (select 1 from public.tasks
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and status = 'completed' and due_at is null and completed_at is not null) then
    raise exception 'final occurrence did not finish task';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$
begin
  if exists (select 1 from public.task_occurrences) then
    raise exception 'other owner can read occurrence history';
  end if;
  begin
    perform public.complete_task_occurrence(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2027-06-01',
      '2027-06-01T09:00:00Z', '2027-07-01T09:00:00Z');
    raise exception 'other owner completed an occurrence';
  exception when others then
    if sqlerrm = 'other owner completed an occurrence' then raise; end if;
  end;
  begin
    perform public.save_recurrence_rule(
      'ffffffff-ffff-4fff-8fff-ffffffffffff', 'daily', 1, null,
      'UTC', null, '2027-01-06T15:00:00Z');
    raise exception 'other owner edited a recurrence rule';
  exception when others then
    if sqlerrm = 'other owner edited a recurrence rule' then raise; end if;
  end;
end;
$$;

rollback;
