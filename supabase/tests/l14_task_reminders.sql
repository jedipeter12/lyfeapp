-- Disposable PostgreSQL only, after the Auth/Storage stubs and all migrations
-- through L--14. Every synthetic row is rolled back.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set constraints all immediate;

insert into public.tasks (id, user_id, title, status, priority, due_at)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111', 'Reminder task',
  'pending', 'medium', '2027-03-13T15:00:00Z');
insert into public.reminders (user_id, task_id, remind_at, status)
values ('11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2027-03-13T15:00:00Z', 'pending');

do $$
begin
  begin
    insert into public.reminders (user_id, task_id, remind_at, status)
    values ('11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2027-03-13T15:00:00Z', 'pending');
    raise exception 'duplicate pending reminder was accepted';
  exception when unique_violation then null;
  end;
end;
$$;

update public.tasks set due_at = '2027-03-14T14:00:00Z'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if not exists (
    select 1 from public.reminders
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and remind_at = '2027-03-14T14:00:00Z' and status = 'pending'
  ) then raise exception 'due change did not advance reminder'; end if;
end;
$$;

update public.tasks set completed_at = now(), status = 'completed'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if exists (
    select 1 from public.reminders
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and status = 'pending'
  ) then raise exception 'completed task kept pending reminder'; end if;
end;
$$;

update public.tasks set completed_at = null, status = 'pending'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.reminders set status = 'pending'
where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.tasks set deleted_at = now()
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if exists (
    select 1 from public.reminders
    where task_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and status = 'pending'
  ) then raise exception 'soft-deleted task kept pending reminder'; end if;
  if has_function_privilege('authenticated', 'public.sync_task_reminder()', 'EXECUTE') then
    raise exception 'authenticated can call reminder trigger directly';
  end if;
end;
$$;

insert into public.tasks (id, user_id, title, status, priority, due_at)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-1111-4111-8111-111111111111', 'Recurring reminder task',
  'pending', 'medium', '2027-05-01T14:00:00Z');
select public.save_recurrence_rule(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'monthly', 1, null,
  'America/Chicago', '2027-06-01T14:00:00Z', '2027-05-01T14:00:00Z');
insert into public.reminders (user_id, task_id, remind_at, status)
values ('11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2027-05-01T14:00:00Z', 'pending');
select public.complete_task_occurrence(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2027-05-01',
  '2027-05-01T14:00:00Z', '2027-06-01T14:00:00Z');
do $$
begin
  if not exists (
    select 1 from public.reminders
    where task_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and remind_at = '2027-06-01T14:00:00Z' and status = 'pending'
  ) then raise exception 'recurrence completion did not advance reminder'; end if;
end;
$$;
select public.complete_task_occurrence(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2027-06-01',
  '2027-06-01T14:00:00Z', null);
do $$
begin
  if exists (
    select 1 from public.reminders
    where task_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and status = 'pending'
  ) then raise exception 'final recurrence completion kept reminder'; end if;
end;
$$;

rollback;
